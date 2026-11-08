"""Check that the Chinese pages in zh/ stay in step with the English pages.

Run from the repo folder (standard library only):

    python tools/check-translations.py

For every English page it checks that the Chinese twin exists and has the same structure: the same ids in the
same order, the same data-* attributes, the same citations and sources, lang="zh-CN", shared files linked one
folder up, a language switch back to the English page, links that resolve, and no em dashes in the Chinese text.
It exits with an error when anything is out of step, so it can run before every commit.
"""
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['data-analytics-playbook.html', 'playbook.html', 'ai.html', 'ai-learn.html', 'ai-brief.html', 'ai-check.html',
         'ai-delegate.html', 'ai-value.html', 'ai-analytics.html', 'reading.html']
SHARED = ('site.css', 'site.js', 'icons.svg', 'covers/', 'favicon.svg', 'fonts/')
ID = re.compile(r'\sid="([^"]+)"')
DATA = re.compile(r'\s(data-[a-z-]+)="([^"]*)"')
CITE = re.compile(r'class="cite" href="#(src-\d+)"')
HREF = re.compile(r'\s(?:href|src)="([^"]+)"')
BLOCK = re.compile(r'<(h[1-4]|p|li|dt|dd|td|th|figcaption|blockquote|aside|section|article|figure|table)\b')


def visible_text(html):
    html = re.sub(r'<(script|style|pre|code)\b.*?</\1>', ' ', html, flags=re.S)
    return re.sub(r'<[^>]+>', ' ', html)


def check_page(name):
    problems = []
    english = (REPO / name).read_text(encoding='utf-8')
    twin = REPO / 'zh' / name
    if not twin.exists():
        return ['missing zh/' + name]
    chinese = twin.read_text(encoding='utf-8')

    if ID.findall(english) != ID.findall(chinese):
        problems.append('ids differ from the English page (order or names)')
    # Data attributes that hold words may be translated; their names and count must match
    if [n for n, _ in DATA.findall(english)] != [n for n, _ in DATA.findall(chinese)]:
        problems.append('data-* attributes differ from the English page')
    # Same paragraphs, list items, headings and table cells: catches a sentence or block added on one side only
    english_blocks, chinese_blocks = BLOCK.findall(english), BLOCK.findall(chinese)
    if english_blocks != chinese_blocks:
        at = next((i for i, (a, b) in enumerate(zip(english_blocks, chinese_blocks)) if a != b), min(len(english_blocks), len(chinese_blocks)))
        problems.append('block structure differs ({} vs {} blocks; first difference at block {})'.format(len(english_blocks), len(chinese_blocks), at + 1))
    if CITE.findall(english) != CITE.findall(chinese):
        problems.append('citations differ from the English page')
    if name != 'data-analytics-playbook.html' and '<html lang="zh-CN">' not in chinese:
        problems.append('missing <html lang="zh-CN">')

    back = '../index.html' if name == 'data-analytics-playbook.html' else '../' + name
    if 'class="lang-switch" href="' + back + '"' not in chinese:
        problems.append('language switch does not point to ' + back)
    forward = 'zh/index.html' if name == 'data-analytics-playbook.html' else 'zh/' + name
    if 'class="lang-switch" href="' + forward + '"' not in english:
        problems.append('English page has no switch to ' + forward)

    for link in HREF.findall(chinese):
        if link.startswith(('http:', 'https:', 'mailto:', '#')) or link == back:
            continue
        path = link.split('#')[0]
        if path.startswith(SHARED):
            problems.append('shared file linked without ../: ' + link)
        elif path == 'index.html':
            continue
        elif not (twin.parent / path).exists() and not path.startswith('../icons.svg'):
            problems.append('link does not resolve: ' + link)

    text = visible_text(chinese)
    if '—' in text or '–' in text:
        problems.append('em or en dash in the Chinese text')
    return problems


def main():
    failures = 0
    for name in PAGES:
        problems = check_page(name)
        failures += len(problems)
        print(('OK    ' if not problems else 'FAIL  ') + name)
        for problem in problems:
            print('      - ' + problem)
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    main()
