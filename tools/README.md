# Data import tools

One-shot scripts used to build `src/data/cards/` and `src/i18n/vi.ts`. They are
kept for reproducibility, not run by the build.

| Script | What it does |
| --- | --- |
| `map_abilities.py` | Matches the reference repo's ability ids to ours **by dice signature**, because its English ability names are a Chinese round-trip and cannot be trusted. Writes `ability-map.json`. |
| `import_cards.py` | Generates `src/data/cards/*.ts` from the reference repo plus its English locale bundle. Renames upgrade cards after our ability names and rewrites token/die vocabulary to match the printed boards. |
| `extract_art.py` | Slices the illustration window out of each hero's card atlas into `public/cards/`. Action cards only — see the Artwork section of the main README. Writes `art-manifest.json`, which `import_cards.py` reads. |
| `build_vi.py` | Merges the hand-written Vietnamese batches, generates the formulaic upgrade-card strings from the translated ability names, and emits `src/i18n/vi.ts`. Fails if any key is left untranslated. |

They expect a `ref/` directory holding files fetched from
[zhuanggenhua/BoardGame](https://github.com/zhuanggenhua/BoardGame) (MIT):
`ref/loc-en.json`, `ref/ids.ts`, `ref/commonCards.ts`,
`ref/heroes/<hero>_{cards,abilities}.ts` and `ref/atlas-{ninja,treant}.json`,
plus the card atlases in `atlas/<hero>.webp`.

Run order: `map_abilities.py` -> `extract_art.py` -> `import_cards.py`.
