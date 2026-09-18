#!/usr/bin/env bash
# Rebuild every document, PDF and the live panel from src/.
# Run from the workspace root:  bash tools/rebuild.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== documents =="
python3 src/build.py src/doc.css src/lending_body_en.html src/lending_js_en.html \
  src/report2-data.json docs/studies/organic-vs-subsidies.html "Organic yield against token subsidies"
python3 src/build.py src/doc.css src/morpho_body_en.html src/morpho_js_en.html \
  src/morpho-data.json docs/studies/morpho-curators.html "Who runs your money in Morpho"
python3 src/build.py src/doc.css src/dex_body_en.html src/dex_js_en.html \
  src/dex-data.json docs/studies/dex-mercenary-liquidity.html "Mercenary liquidity"
python3 src/build.py src/doc.css src/stable_body_en.html src/stable_js_en.html \
  src/dex-data.json docs/studies/stablecoin-yield.html "The rate that does not hold"

echo "== live panels =="
python3 - <<'PY'
import io
css  = io.open('src/dash.css.html', encoding='utf-8').read()
core = io.open('src/core.js', encoding='utf-8').read()
PANELS = [
  ('lending', 'dash-head.html', 'dash-body.html', 'dash-app.js', 'baseline.json',        'Lending yield, live'),
  ('morpho',  None,             'morpho-body.html','morpho-app.js','baseline-morpho.json','Morpho curators, live'),
  ('dex',     None,             'dex-body.html',  'dex-app.js',   'baseline-dex.json',   'Mercenary liquidity, live'),
  ('stable',  None,             'stable-body.html','stable-app.js','baseline-stable.json','Stablecoin yield, live'),
]
for name, head, body, app, data, title in PANELS:
    h = io.open('src/' + head, encoding='utf-8').read() if head else css
    h = h.replace('<title>Lending yield, live</title>', '<title>' + title + '</title>', 1)
    b = io.open('src/' + body, encoding='utf-8').read()
    j = io.open('src/' + app, encoding='utf-8').read().replace(
        '__BASELINE__', io.open('src/' + data, encoding='utf-8').read())
    parts = [h, '</head>\n<body>\n', b, '\n']
    if head is None:
        parts.append(core + '\n')
    parts.append(j)
    out = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
           + ''.join(parts) + '\n</body>\n</html>\n')
    io.open('docs/' + name + '-live.html', 'w', encoding='utf-8').write(out)
    print('docs/' + name + '-live.html', len(out))
PY

echo "== pdfs (needs node + playwright + chromium) =="
if node -e "require('playwright')" 2>/dev/null; then
  node src/pdf_doc.js docs/studies/organic-vs-subsidies.html      docs/organic-vs-subsidies-2026-09.pdf   "Organic yield against token subsidies"
  node src/pdf_doc.js docs/studies/morpho-curators.html           docs/morpho-curators-2026-09.pdf        "Who runs your money in Morpho"
  node src/pdf_doc.js docs/studies/dex-mercenary-liquidity.html   docs/dex-mercenary-liquidity-2026-09.pdf "Mercenary liquidity"
  node src/pdf_doc.js docs/studies/stablecoin-yield.html          docs/stablecoin-yield-2026-09.pdf       "The rate that does not hold"
else
  echo "   skipped: playwright not installed (npm i playwright)"
fi

echo "== verify =="
python3 tools/verify.py

rm -f docs/studies/*_pdf.html

python3 - <<'PY'
import io, os
for f in os.listdir('docs/studies'):
    p = 'docs/studies/' + f
    s = io.open(p, encoding='utf-8').read()
    if s.lstrip().lower().startswith('<!doctype'):
        continue
    import re
    m = re.search(r'<title>(.*?)</title>', s, re.S)
    t = m.group(1) if m else 'Study'
    s = re.sub(r'<title>.*?</title>\s*', '', s, count=1, flags=re.S)
    s = s.replace('https://github.com/Wandory/research/raw/main/data/', '../data/')
    io.open(p, 'w', encoding='utf-8').write(
      '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
      '<title>' + t + '</title>\n</head>\n<body>\n' + s + '\n</body>\n</html>\n')
print('docs/studies wrapped')
PY

echo "== done =="
