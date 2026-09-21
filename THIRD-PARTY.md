# Third-party material

## Card data — zhuanggenhua/BoardGame (MIT)

`src/data/cards/` is generated from
[zhuanggenhua/BoardGame](https://github.com/zhuanggenhua/BoardGame) by the
scripts in `tools/`. Card structure (cost, timing, type, upgrade target) and
rules text come from that project and its English locale bundle.

```
MIT License

Copyright (c) 2026 时侍

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Dice Throne — Roxley Games

Dice Throne is designed by Manny Trembley and Nate Chatellier and published by
Roxley Games. This project is an unofficial fan re-implementation and is not
affiliated with or endorsed by Roxley.

The bitmaps under `public/heroes/` and `public/cards/` are Roxley's artwork,
cropped from photographs and scans of the printed components. The rules text
reproduced on the hero boards and cards is theirs as well.

Both folders are optional: a hero without a `portrait` and a card without `art`
fall back to a placeholder frame, so deleting them degrades the app gracefully
rather than breaking it.
