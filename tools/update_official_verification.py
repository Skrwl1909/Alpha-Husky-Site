"""Check official details without rewriting page markup or historic records."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MINT = 'FY6ynAy9XUfiABUf9PkF9QzjSmZDTfWJJMLTmYyjBAGS'
VALUES = [MINT, 'https://alphahusky.win/', 'contact@alphahusky.win',
          'https://x.com/The_Alpha_Husky', 'https://t.me/Alpha_Husky_ct',
          'https://t.me/Alpha_husky_bot/AlphaHuskyHub', 'https://app.alphahusky.win/',
          'https://alphahusky.win/assets/howl-token-logo.png']
reference = (ROOT / 'safety & official links.txt').read_text(encoding='utf-8')
for value in VALUES:
    if value not in reference:
        raise SystemExit(f'Official reference missing: {value}')
for page in ('index.html', 'contact.html'):
    content = (ROOT / page).read_text(encoding='utf-8')
    missing = [value for value in VALUES if value not in content]
    if missing:
        raise SystemExit(f'{page}: missing official details: {missing}')
    if content.count(MINT) != 2:
        raise SystemExit(f'{page}: expected mint once in text and once in Solscan URL')
print('Official verification values present on homepage and contact page.')
