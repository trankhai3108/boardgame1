"""Slice the card art window out of each hero's card atlas.

The atlases are Chinese card scans. Only the illustration window is taken; our
own frame renders the (translated) title and rules text over it.
"""
import json, pathlib, re
from PIL import Image

HEROES = {
    'paladin': 'paladin', 'barbarian': 'barbarian', 'monk': 'monk',
    'moon_elf': 'moon-elf', 'pyromancer': 'pyromancer',
    'shadow_thief': 'shadow-thief', 'ninja': 'ninja', 'treant': 'treant',
}
# Common action cards sit at these atlas slots in every hero's sheet.
COMMON_INDEX = {
    'card-play-six': 15, 'card-just-this': 16, 'card-give-hand': 17,
    'card-i-can-again': 18, 'card-me-too': 19, 'card-surprise': 20,
    'card-worthy-of-me': 21, 'card-unexpected': 22, 'card-next-time': 23,
    'card-boss-generous': 24, 'card-flick': 25, 'card-bye-bye': 26,
    'card-double': 27, 'card-super-double': 28, 'card-get-away': 29,
    'card-one-throw-fortune': 30, 'card-what-status': 31, 'card-transfer-status': 32,
}

def card_indices(hero):
    """cardId -> atlas slot, covering both shapes the source files use."""
    src = pathlib.Path(f'ref/heroes/{hero}_cards.ts').read_text()
    out = {}
    for m in re.finditer(r"id: '([a-z0-9-]+)',\s*name: cardText\('\1'", src):
        cid = m.group(1)
        start = m.start()
        nxt = src.find("id: '", start + 5)
        block = src[start: nxt if nxt > 0 else len(src)]
        idx = (re.search(r'index: (\d+)', block)
               or re.search(r'CardRef\((\d+)\)', block))
        if idx:
            out[cid] = int(idx.group(1))
    return out

def detect_grid(im, cols_hint):
    """Find the card cell size by locating the dark gutters between cards."""
    g = im.convert('L')
    w, h = g.size
    px = g.load()
    def bright_runs(n, sample, axis):
        lit = []
        for i in range(n):
            total = sum(px[i, j] if axis == 'x' else px[j, i] for j in sample)
            lit.append(total / len(sample) > 18)
        runs, start = [], None
        for i, on in enumerate(lit + [False]):
            if on and start is None:
                start = i
            elif not on and start is not None:
                if i - start > 20:
                    runs.append((start, i))
                start = None
        return runs
    col_runs = bright_runs(w, range(20, min(h, 600), 7), 'x')
    row_runs = bright_runs(h, range(20, w - 20, 11), 'y')
    return col_runs[:cols_hint], row_runs

# Two heroes ship an explicit atlas config in the source repo; trust it over
# gutter detection, which mis-reads their taller sheets.
ATLAS_CONFIG = {'ninja': 'ref/atlas-ninja.json', 'treant': 'ref/atlas-treant.json'}

def frames_from_config(path, im):
    cfg = json.load(open(path))
    sx, sy = im.width / cfg['imageW'], im.height / cfg['imageH']
    return [(int(f['x'] * sx), int(f['y'] * sy),
             int((f['x'] + f['width']) * sx), int((f['y'] + f['height']) * sy))
            for f in cfg['frames']]

# Fractions of the card cell holding the illustration. Only action cards get
# one: they have a clean art window under the title. Upgrade cards print their
# rules over the artwork at a height that varies card by card, so no single
# window is clean for them — about 40% of the crops came out with Chinese text
# across them. They keep the placeholder frame instead.
ART = {'action': (0.085, 0.145, 0.935, 0.470)}

def main():
    out_root = pathlib.Path('/home/khai-kun/Desktop/dice thorne/public/cards')
    out_root.mkdir(parents=True, exist_ok=True)
    manifest = {}

    for hero, my_id in HEROES.items():
        im = Image.open(f'atlas/{hero}.webp').convert('RGB')
        if hero in ATLAS_CONFIG:
            frames = frames_from_config(ATLAS_CONFIG[hero], im)
            cols = None
        else:
            cols = 5 if im.width < 1200 else 10
            col_runs, row_runs = detect_grid(im, cols)
            if len(col_runs) < cols or not row_runs:
                print(f'{my_id}: grid detection failed')
                continue
            frames = [(x0, y0, x1, y1) for (y0, y1) in row_runs for (x0, x1) in col_runs]

        indices = card_indices(hero)
        src = pathlib.Path(f'ref/heroes/{hero}_cards.ts').read_text()
        types = dict(re.findall(r"id: '([a-z0-9-]+)',\s*name: cardText\('\1'[\s\S]{0,300}?type: '(\w+)'", src))

        hero_dir = out_root / my_id
        hero_dir.mkdir(exist_ok=True)
        written = 0
        all_cards = {**indices}
        if my_id == 'paladin':
            all_cards.update(COMMON_INDEX)

        for cid, slot in all_cards.items():
            if slot >= len(frames):
                continue
            x0, y0, x1, y1 = frames[slot]
            cw, ch = x1 - x0, y1 - y0
            if types.get(cid) == 'upgrade':
                continue
            ax0, ay0, ax1, ay1 = ART['action']
            art = im.crop((int(x0 + cw * ax0), int(y0 + ch * ay0),
                           int(x0 + cw * ax1), int(y0 + ch * ay1)))
            art = art.resize((art.width * 2, art.height * 2), Image.LANCZOS)
            prefix = 'common-' if cid in COMMON_INDEX and my_id == 'paladin' else f'{my_id}-'
            name = f'{prefix}{cid}.webp'
            art.save((out_root / ('common' if prefix == 'common-' else my_id) / name)
                     if prefix == 'common-' else hero_dir / name, 'WEBP', quality=80, method=6)
            manifest[f'{prefix}{cid}'] = f'/cards/{"common" if prefix == "common-" else my_id}/{name}'
            written += 1
        print(f'{my_id:14} frames={len(frames)}  wrote {written}')

    json.dump(manifest, open('art-manifest.json', 'w'), indent=1)
    print('total art files:', len(manifest))

(pathlib.Path('/home/khai-kun/Desktop/dice thorne/public/cards/common')).mkdir(parents=True, exist_ok=True)
main()
