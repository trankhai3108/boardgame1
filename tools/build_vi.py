"""Merge the hand-written Vietnamese batches, generate the formulaic upgrade-card
entries, and emit src/i18n/vi.ts. Fails loudly on any key left untranslated.
"""
import json, re, pathlib

KEYS = json.load(open('keys.json'))
vi = {}
for batch in ['vi-1.json', 'vi-2a.json', 'vi-2b.json', 'vi-3a.json', 'vi-3b.json']:
    vi.update(json.load(open(batch)))

# Upgrade cards read "<Ability> II" / "Upgrade <Ability> to level II.", so their
# Vietnamese follows from the already-translated ability name.
UPGRADE = re.compile(r'^Upgrade (.+) to level (II|III)\.$')
ability_vi = {v: vi[k] for k, v in KEYS.items()
              if k.startswith('ability.') and k.endswith('.name') and k in vi}

generated = 0
for key, en in KEYS.items():
    if key in vi or not key.startswith('card.'):
        continue
    m = UPGRADE.match(en)
    if m and m.group(1) in ability_vi:
        vi[key] = f'Nâng cấp {ability_vi[m.group(1)]} lên cấp {m.group(2)}.'
        generated += 1
        continue
    name_m = re.match(r'^(.+) (II|III)$', en)
    if key.endswith('.name') and name_m and name_m.group(1) in ability_vi:
        vi[key] = f'{ability_vi[name_m.group(1)]} {name_m.group(2)}'
        generated += 1

missing = [k for k in KEYS if k not in vi]
print(f'generated {generated} upgrade-card strings')
print(f'translated {len(KEYS) - len(missing)}/{len(KEYS)} data keys')
if missing:
    print('MISSING:')
    for k in missing[:40]:
        print('  ', k, '|', KEYS[k])
    raise SystemExit(1)

ui = {k: v for k, v in vi.items() if k.startswith('ui.')}
data = {k: v for k, v in vi.items() if not k.startswith('ui.')}

def ts(d, indent='  '):
    out = []
    for k in sorted(d):
        val = d[k].replace('\\', '\\\\').replace("'", "\\'")
        out.append(f"{indent}'{k}': '{val}',")
    return '\n'.join(out)

pathlib.Path('/home/khai-kun/Desktop/dice thorne/src/i18n/vi.ts').write_text(
    "import type { Dict } from './types';\n\n"
    "/**\n"
    " * Vietnamese.\n"
    " *\n"
    " * UI strings plus an override for every hero, ability, card and status\n"
    " * string carried by the data files. Anything missing falls back to the\n"
    " * English already in the data, so partial coverage still renders.\n"
    " */\n"
    "export const VI: Dict = {\n"
    "  /* --- interface --- */\n"
    f"{ts(ui)}\n\n"
    "  /* --- game data --- */\n"
    f"{ts(data)}\n"
    "};\n")
print('wrote src/i18n/vi.ts')
