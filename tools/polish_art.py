"""Clean up the card and portrait art in public/.

The source art came from photographs of the printed cards, so it arrives small
(around 280x178 for a card window) and soft, and a few crops kept a flat band
of dead pixels along one edge where the frame was included by mistake. None of
that can be undone — there is no higher-resolution source — but three things
genuinely help:

  trim   A near-constant band along an edge is a crop artefact, not part of
         the picture. Only bands that are almost perfectly flat are taken, so
         a deliberately dark sky is never mistaken for one.

  scale  On a 2x display the browser stretches a 280px image to 560px with
         bilinear filtering, which is the softest option there is. Shipping a
         Lanczos-resampled image at that size does not add detail, but it does
         replace the browser's worst resampler with a better one.

  sharpen A modest unsharp mask restores the edge contrast the photograph and
         the first round of compression took out.

Run once: `python3 tools/polish_art.py`. It rewrites the files in place, and
git holds the originals. Pass --dry-run to see what it would do.
"""

import argparse
import pathlib
import statistics
import sys

try:
    from PIL import Image, ImageFilter
except ImportError:  # pragma: no cover - a developer tool, not shipped code
    sys.exit('Pillow is required: pip install Pillow')

ART = pathlib.Path('public')

# A band must be this flat to count as a crop artefact rather than a dark sky.
FLATNESS = 10
# ...and this far from the picture's own midtone.
CONTRAST = 45
# Never eat more than this much of a side, whatever the detector says.
MAX_TRIM = 0.30

SCALE = 1.75
UNSHARP = dict(radius=1.4, percent=105, threshold=2)
QUALITY = 86


def dead_bands(im: Image.Image) -> tuple[int, int, int, int]:
    """Left, right, top and bottom runs of flat, off-tone lines."""
    grey = im.convert('L')
    width, height = grey.size
    px = grey.load()
    mid = statistics.median(
        [px[x, y] for x in range(0, width, 5) for y in range(0, height, 5)]
    )

    def column(x: int) -> list[int]:
        return [px[x, y] for y in range(height)]

    def row(y: int) -> list[int]:
        return [px[x, y] for x in range(width)]

    def run(n: int, get, reverse: bool) -> int:
        found = 0
        for k in range(int(n * MAX_TRIM)):
            line = get(n - 1 - k if reverse else k)
            flat = statistics.pstdev(line) < FLATNESS
            off = abs(statistics.mean(line) - mid) > CONTRAST
            if not (flat and off):
                break
            found += 1
        return found

    return (
        run(width, column, False),
        run(width, column, True),
        run(height, row, False),
        run(height, row, True),
    )


def polish(path: pathlib.Path, dry_run: bool) -> str:
    im = Image.open(path).convert('RGB')
    before = im.size

    left, right, top, bottom = dead_bands(im)
    if left or right or top or bottom:
        im = im.crop((left, top, im.width - right, im.height - bottom))

    im = im.resize((round(im.width * SCALE), round(im.height * SCALE)), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(**UNSHARP))

    note = f'{before[0]}x{before[1]} -> {im.width}x{im.height}'
    if left or right or top or bottom:
        note += f'  (trimmed L{left} R{right} T{top} B{bottom})'

    if not dry_run:
        im.save(path, 'WEBP', quality=QUALITY, method=6)
    return note


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    files = sorted(ART.rglob('*.webp'))
    if not files:
        sys.exit(f'No artwork under {ART}/')

    before = sum(f.stat().st_size for f in files)
    trimmed = 0
    for path in files:
        note = polish(path, args.dry_run)
        if 'trimmed' in note:
            trimmed += 1
        print(f'{path.relative_to(ART).as_posix():50} {note}')

    after = sum(f.stat().st_size for f in files)
    print(
        f'\n{len(files)} assets, {trimmed} with a dead edge trimmed. '
        f'{before / 1024:.0f} KB -> {after / 1024:.0f} KB'
    )


if __name__ == '__main__':
    main()
