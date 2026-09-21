"""Match the reference repo's ability ids to ours by dice signature.

Their English ability names are a Chinese round-trip, so names cannot be
trusted; the activation requirement can.
"""
import json, re, pathlib

MY_DIR = pathlib.Path('/home/khai-kun/Desktop/dice thorne/src/data/heroes/season1')

# Their face *value* -> our symbol id.
FACE_VALUES = {
    'paladin':      {'sword':'sword','helm':'helmet','heart':'life','pray':'prayer'},
    'barbarian':    {'sword':'sword','heart':'life','strength':'pow'},
    'monk':         {'fist':'fist','palm':'palm','taiji':'zen','lotus':'lotus'},
    'moon_elf':     {'bow':'arrow','foot':'foot','moon':'moon'},
    'pyromancer':   {'fire':'flame','magma':'blaze','fiery_soul':'fierySoul','meteor':'meteor'},
    'shadow_thief': {'dagger':'dagger','bag':'bag','card':'card','shadow':'shadow'},
    'ninja':        {'ninja_katana':'ninjato','shuriken':'shuriken','mask':'mask'},
    'treant':       {'branch':'branch','leaf':'leaf','spirit':'spirit'},
}
CONST_NAME = {
    'paladin':'PALADIN_DICE_FACE_IDS', 'barbarian':'BARBARIAN_DICE_FACE_IDS',
    'monk':'DICE_FACE_IDS', 'moon_elf':'MOON_ELF_DICE_FACE_IDS',
    'pyromancer':'PYROMANCER_DICE_FACE_IDS', 'shadow_thief':'SHADOW_THIEF_DICE_FACE_IDS',
    'ninja':'NINJA_DICE_FACE_IDS', 'treant':'TREANT_DICE_FACE_IDS',
}

def build_face_map(hero):
    """Code references faces by constant KEY (FACE.KATANA), so resolve
    KEY -> value from ids.ts, then value -> our symbol."""
    ids = pathlib.Path('ref/ids.ts').read_text()
    m = re.search(rf'export const {CONST_NAME[hero]}\s*=\s*\{{(.*?)\}} as const;', ids, re.S)
    pairs = re.findall(r"^\s*([A-Z_0-9]+):\s*'([^']+)'", m.group(1), re.M)
    values = FACE_VALUES[hero]
    return {key.lower(): values[val] for key, val in pairs if val in values}

FACES = {h: build_face_map(h) for h in FACE_VALUES}
MY_FILE = {
    'paladin':'paladin','barbarian':'barbarian','monk':'monk','moon_elf':'moonElf',
    'pyromancer':'pyromancer','shadow_thief':'shadowThief','ninja':'ninja','treant':'treant',
}

def sig(d):
    return 'sym:' + ','.join(f'{k}={v}' for k, v in sorted(d.items()))

def balanced_block(src, idx):
    """The brace-balanced object containing position `idx`."""
    start = src.rfind('{', 0, idx)
    depth = 0
    for i in range(start, len(src)):
        if src[i] == '{': depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0: return src[start:i + 1]
    return src[start:]

def my_signatures(hero):
    src = (MY_DIR / f'{MY_FILE[hero]}.ts').read_text()
    out = {}
    for m in re.finditer(r"id: '([a-z0-9-]+)',\n      name: ['\"]", src):
        aid = m.group(1)
        block = balanced_block(src, m.start())
        sigs = set()
        for sm in re.finditer(r"requirement: \{ kind: '(\w+)',([^}]*)\}", block):
            kind, rest = sm.group(1), sm.group(2)
            if kind == 'symbols':
                sigs.add(sig({k: int(v) for k, v in re.findall(r'(\w+):\s*(\d+)', rest)}))
            elif kind == 'straight':
                sigs.add('straight:' + re.search(r'length:\s*(\d+)', rest).group(1))
            elif kind == 'defenseRoll':
                sigs.add('defense:' + re.search(r'dice:\s*(\d+)', rest).group(1))
        out[aid] = sigs
    return out

def their_signatures(hero):
    src = pathlib.Path(f'ref/heroes/{hero}_abilities.ts').read_text()
    fmap = FACES[hero]
    out = {}
    for m in re.finditer(r"id: '([a-z0-9-]+)',\s*\n\s*name: abilityText\('\1'", src):
        aid = m.group(1)
        block = balanced_block(src, m.start())
        sigs = set()
        for tm in re.finditer(r"trigger: (\{\s*type: '(\w+)')", block):
            kind = tm.group(2)
            rest = balanced_block(block, tm.start(1) + 1)
            if kind == 'diceSet':
                faces = {}
                for fk, fv in re.findall(r'\.(\w+)\]:\s*(\d+)', rest):
                    s = fmap.get(fk.lower())
                    if s: faces[s] = int(fv)
                if faces: sigs.add(sig(faces))
            elif kind == 'smallStraight': sigs.add('straight:4')
            elif kind == 'largeStraight': sigs.add('straight:5')
            elif kind == 'allSymbolsPresent':
                syms = [fmap.get(f.lower()) for f in re.findall(r'\.(\w+)\b', rest)]
                faces = {s2: 1 for s2 in syms if s2}
                if faces: sigs.add(sig(faces))
            elif kind == 'phase':
                dm = re.search(r'diceCount:\s*(\d+)', rest)
                if dm: sigs.add('defense:' + dm.group(1))
        out[aid] = sigs
    return out

# Verified by reading the definitions: passives carry no dice signature.
MANUAL = {
    'paladin': {'tithes': 'tithe'},
    'treant': {'quiet-cultivation': 'fertilize'},
}

en = json.load(open('ref/loc-en.json'))['abilities']
mapping, problems = {}, []
for hero in FACES:
    mine, theirs = my_signatures(hero), their_signatures(hero)
    print(f'\n=== {hero}')
    hero_map = {}
    for tid, tsigs in theirs.items():
        hits = [aid for aid, msigs in mine.items() if tsigs and (tsigs & msigs)]
        name = en.get(tid, {}).get('name', '?')
        if len(hits) == 1:
            hero_map[tid] = hits[0]
            print(f'  OK  {tid:22} -> {hits[0]:22} ({name})')
        else:
            problems.append((hero, tid, hits, sorted(tsigs), name))
            print(f'  ??  {tid:22} -> {hits or "NONE"}  ({name})  sigs={sorted(tsigs)}')
    missing = sorted(set(mine) - set(hero_map.values()))
    if missing: print(f'  ours still unmapped: {missing}')
    hero_map.update(MANUAL.get(hero, {}))
    mapping[hero] = hero_map
json.dump(mapping, open('ability-map.json', 'w'), indent=2)
print(f'\nmapped {sum(len(v) for v in mapping.values())} abilities, {len(problems)} need a decision')
