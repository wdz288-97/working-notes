"""Trim Noto Sans SC to the characters the Chinese pages use, as one small web font.

The full font (NotoSansSC[wght].ttf, about 18MB) is not kept in the repo. Download it once from
https://github.com/google/fonts/tree/main/ofl/notosanssc and run, from the repo folder:

    .venv/Scripts/python tools/subset-zh-font.py path/to/NotoSansSC[wght].ttf

Rerun it whenever new Chinese text is added: characters missing from the font show in the
reader's system font until then. Needs fonttools and brotli in the project's .venv.
"""
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / 'fonts' / 'noto-sans-sc.woff2'
# The site uses light (300) for big titles, regular (400) for text, semibold (600) and bold (700) for headings
WEIGHTS = (300, 700)
# Always kept, so new text with common punctuation, digits and Latin letters still renders in this font
BASE = ''.join(chr(c) for c in range(0x20, 0x7F)) + '“”‘’…·、。，：；？！（）《》「」【】％＋−×÷→←↑↓✓✗　' + \
    ''.join(chr(c) for c in range(0xFF01, 0xFF5F))


def site_text():
    """Every character in the Chinese pages and in the script that draws their labels."""
    sources = sorted((REPO / 'zh').glob('*.html')) + [REPO / 'site.js']
    if len(sources) < 2:
        raise SystemExit('No Chinese pages found in ' + str(REPO / 'zh'))
    return ''.join(path.read_text(encoding='utf-8') for path in sources)


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    source = pathlib.Path(sys.argv[1])
    if not source.is_file():
        raise SystemExit('Font not found: ' + str(source))

    characters = sorted(set(site_text() + BASE))
    cjk = [c for c in characters if '㐀' <= c <= '鿿']

    font = TTFont(source, lazy=False)
    if 'fvar' not in font:
        raise SystemExit('Expected the variable font NotoSansSC[wght].ttf')

    # Subset first, then narrow the weight range: the other order trips over glyphs already removed
    options = subset.Options()
    options.hinting = False
    options.layout_features = ['*']
    options.name_IDs = ['*']
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=''.join(characters))
    subsetter.subset(font)
    font = instancer.instantiateVariableFont(font, {'wght': WEIGHTS})

    OUT.parent.mkdir(exist_ok=True)
    font.flavor = 'woff2'
    font.save(str(OUT))
    print('Kept', len(characters), 'characters (' + str(len(cjk)) + ' Chinese), weights',
          '-'.join(map(str, WEIGHTS)), '->', OUT.relative_to(REPO), round(OUT.stat().st_size / 1024), 'KB')


if __name__ == '__main__':
    main()
