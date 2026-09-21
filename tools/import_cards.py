"""Generate our card data from the reference repo (MIT, zhuanggenhua/BoardGame).

Only structure and rules text are taken. Card *names* there are a Chinese
round-trip and do not match the printed English cards, which is recorded in
the generated header.
"""
import json, re, pathlib

OUT = pathlib.Path('/home/khai-kun/Desktop/dice thorne/src/data/cards')
OUT.mkdir(parents=True, exist_ok=True)

EN = json.load(open('ref/loc-en.json'))['cards']
# Written by extract_art.py; absent on a first run, which just means no art.
try:
    ART_FILES = json.load(open('art-manifest.json'))
except FileNotFoundError:
    ART_FILES = {}
AB_MAP = json.load(open('ability-map.json'))

HEROES = {
    'paladin': 'PALADIN', 'barbarian': 'BARBARIAN', 'monk': 'MONK',
    'moon_elf': 'MOON_ELF', 'pyromancer': 'PYROMANCER',
    'shadow_thief': 'SHADOW_THIEF', 'ninja': 'NINJA', 'treant': 'TREANT',
}
MY_ID = {'moon_elf': 'moon-elf', 'shadow_thief': 'shadow-thief'}
TIMING = {'main': 'mainPhase', 'roll': 'rollPhase', 'instant': 'instant'}
LEVEL = {'2': 'II', '3': 'III'}

def balanced(src, idx):
    start = src.rfind('{', 0, idx)
    depth = 0
    for i in range(start, len(src)):
        if src[i] == '{': depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0: return src[start:i + 1]
    return src[start:]

def parse_cards(path, hero=None):
    src = pathlib.Path(path).read_text()
    cards = []
    # Card objects appear both multi-line and on a single line.
    for m in re.finditer(r"id: '([a-z0-9-]+)',\s*name: cardText\('\1'", src):
        cid = m.group(1)
        block = balanced(src, m.start())
        typ = re.search(r"type: '(\w+)'", block).group(1)
        cp = int(re.search(r'cpCost: (\d+)', block).group(1))
        timing = re.search(r"timing: '(\w+)'", block).group(1)
        entry = {'id': cid, 'type': typ, 'cp': cp, 'timing': timing}
        # Two shapes in the source: the replaceAbility() helper, and an inline action.
        up = (re.search(r"replaceAbility\(\s*'([a-z0-9-]+)'\s*,\s*[A-Z0-9_]+[^,]*,\s*(\d+)", block)
              or re.search(r"targetAbilityId: '([a-z0-9-]+)'.*?newAbilityLevel: (\d+)", block, re.S))
        if up:
            their_ability, level = up.group(1), up.group(2)
            entry['upgrades'] = AB_MAP.get(hero, {}).get(their_ability)
            entry['upgradeLevel'] = LEVEL.get(level)
            entry['theirAbility'] = their_ability
        cards.append(entry)
    return cards

def split_text(s):
    """Break rules text into the short lines the card frame renders.

    Hard line breaks in the source are the author's own and are kept; long
    single lines are split on sentence boundaries.
    """
    s = s.replace('\u2192', '->')
    parts = []
    for line in s.split('\n'):
        line = line.strip()
        if not line:
            continue
        parts.extend(x.strip() for x in re.split(r'(?<=[.;])\s+', line) if x.strip())
    return parts or [s.replace('\n', ' ').strip()]

def ts_string(s):
    s = s.replace('\n', ' ').replace('\r', ' ')
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"

def my_ability_names(hero):
    """Ability display names from our own data, which follow the printed board."""
    my = {'moon_elf': 'moonElf', 'shadow_thief': 'shadowThief'}.get(hero, hero)
    src = (pathlib.Path('/home/khai-kun/Desktop/dice thorne/src/data/heroes/season1')
           / f'{my}.ts').read_text()
    out = {}
    for m in re.finditer(r"id: '([a-z0-9-]+)',\n      name: (?:'([^']*)'|\"([^\"]*)\")", src):
        out[m.group(1)] = m.group(2) or m.group(3)
    return out

GENERIC_UPGRADE = re.compile(r'^Upgrade .+ to Level \d\.?$', re.I)
# A few sources write "Upgrade X: <the actual change>"; keep only the change.
UPGRADE_PREFIX = re.compile(r'^Upgrade [^:]+:\s*', re.I)

# The source uses its own vocabulary for tokens and die faces. Ours follows the
# printed boards, so align the two or the cards contradict the hero board.
TERMS = [
    ('Life Sap', 'Wellspring'), ('Thorn', 'Barbed Vine'), ('Purify', 'Cleanse'),
    ('Ninja Blade', 'Ninjat\u014d'), ('Blinded', 'Blind'), ('Fire Soul', 'Fiery Soul'),
    ('Taiji', 'Zen'), ('cultivates', 'grows'), ('Cultivates', 'Grows'),
    ('cultivate', 'grow'), ('Cultivate', 'Grow'),
    ('Bows', 'Arrows'), ('Bow', 'Arrow'), ('Helm', 'Helmet'), ('Pray', 'Prayer'),
    ('Strength', 'Pow'), ('Heart', 'Life'), ('Lava', 'Blaze'),
]

def retermed(s):
    for a, b in TERMS:
        s = re.sub(rf'\b{re.escape(a)}\b', b, s)
    return s

# The source sprinkles a few emoji where our text markup has a proper icon.
EMOJI = {'\U0001f64f': '[[prayer]]', '\U0001f5e1': '[[dagger]]', '\U0001f311': '[[moon]]'}

def demoji(s):
    for k, v in EMOJI.items():
        s = s.replace(k, v)
    return s

def emit(name, const, cards, prefix, note, ability_names=None):
    lines = [
        '/**', f' * {note}', ' *',
        ' * Generated from zhuanggenhua/BoardGame (MIT). Rules text is faithful;',
        ' * card names there are a Chinese round-trip and do not always match the',
        ' * names printed on the English cards.',
        ' */', "import type { Card } from '../../engine/types';", '',
        f'export const {const}: Card[] = [',
    ]
    missing = []
    for c in cards:
        en = EN.get(c['id'], {})
        cname = retermed(en.get('name') or c['id'])
        desc = en.get('description') or ''
        if not desc: missing.append(c['id'])
        lines_text = split_text(desc)

        # Upgrade cards in the source are named after that repo's ability names,
        # which are a Chinese round-trip. Rename them after the ability as it is
        # printed on the hero board, and keep any rules text beyond the generic
        # "Upgrade X to Level N" sentence.
        if c['type'] == 'upgrade' and ability_names and c.get('upgrades'):
            ability = ability_names.get(c['upgrades'])
            if ability:
                level = c['upgradeLevel']
                cname = f'{ability} {level}'
                # The remaining lines restate the upgraded ability in the source
                # repo's vocabulary. The engine tracks the level but does not yet
                # swap in the upgraded rules, so printing them would mislead.
                lines_text = [f'Upgrade {ability} to level {level}.']
        lines.append('  {')
        lines.append(f"    id: '{prefix}{c['id']}',")
        lines.append(f'    name: {ts_string(cname)},')
        if c['type'] == 'upgrade':
            lines.append("    type: 'upgrade',")
        else:
            lines.append(f"    type: '{TIMING.get(c['timing'], 'mainPhase')}',")
        lines.append(f"    cp: {c['cp']},")
        lines.append('    copies: 1,')
        lines.append('    text: [')
        for part in lines_text:
            lines.append(f'      {ts_string(retermed(demoji(part)))},')
        lines.append('    ],')
        art = ART_FILES.get(f"{prefix}{c['id']}")
        if art:
            lines.append(f"    art: '{art}',")
        if c.get('upgrades'):
            lines.append(f"    upgrades: '{c['upgrades']}',")
            lines.append(f"    upgradeLevel: '{c['upgradeLevel']}',")
        elif c['type'] == 'upgrade':
            lines.append(f"    // unmapped upgrade target: {c.get('theirAbility')}")
        lines.append('  },')
    lines += ['];', '']
    (OUT / name).write_text('\n'.join(lines))
    return missing

common = parse_cards('ref/commonCards.ts')
m = emit('common.ts', 'COMMON_CARDS', common, 'common-',
         'Action cards every hero shares (different art, same rules).')
print(f'common: {len(common)} cards, missing text: {m}')

for hero, const in HEROES.items():
    cards = parse_cards(f'ref/heroes/{hero}_cards.ts', hero)
    my = MY_ID.get(hero, hero)
    unmapped = [c['id'] for c in cards if c['type'] == 'upgrade' and not c.get('upgrades')]
    m = emit(f'{my}.ts', f'{const}_CARDS', cards, f'{my}-',
             f'{const.replace("_", " ").title()} hero cards.', my_ability_names(hero))
    print(f'{my:14} {len(cards):>3} cards   unmapped upgrades: {unmapped or "-"}   missing text: {m or "-"}')
