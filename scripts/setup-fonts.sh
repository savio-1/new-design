#!/usr/bin/env bash
# Install Geist and Nunito Sans locally so headless Chromium renders the real
# fonts. The sandbox cannot load Google Fonts at page time, and without this
# every text measurement is taken against a fallback face.
#
# Google serves woff2 to modern UAs (fontconfig can't read woff2) and EOT to
# old ones, so: fetch woff2, convert to ttf with fontTools, and rename the
# family (Google's subsets report "Nunito Sans 12pt ExtraLight 12pt").
set -euo pipefail
pip install --quiet fonttools brotli >/dev/null 2>&1 || true
mkdir -p "$HOME/.fonts" /tmp/acfonts
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
i=0
for fam in "Nunito+Sans:wght@400;600;700" "Geist:wght@300;350;400;500;600"; do
  curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=${fam}&display=swap" -o /tmp/acfonts/f.css
  grep -o 'https://fonts.gstatic.com[^)]*' /tmp/acfonts/f.css | sort -u > /tmp/acfonts/urls.txt
  while read -r u; do i=$((i+1)); curl -s "$u" -o "/tmp/acfonts/w$i.woff2"; done < /tmp/acfonts/urls.txt
done
python3 - <<'PY'
import glob, pathlib
from fontTools.ttLib import TTFont
out = pathlib.Path.home() / '.fonts'
for i, w in enumerate(sorted(glob.glob('/tmp/acfonts/w*.woff2'))):
    f = TTFont(w); f.flavor = None
    full = f['name'].getDebugName(4) or ''
    fam = 'Nunito Sans' if 'Nunito' in full else 'Geist'
    for rec in f['name'].names:
        if rec.nameID in (1, 16):
            rec.string = fam.encode('utf-16-be') if rec.platformID == 3 else fam.encode('latin-1')
    f.save(out / f'{fam.replace(" ", "")}-{i}.ttf')
PY
fc-cache -f >/dev/null 2>&1
echo "Resolved: $(fc-match 'Nunito Sans')  |  $(fc-match 'Geist')"
