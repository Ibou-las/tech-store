#!/usr/bin/env python3
"""Remplace l'adresse du site partout (aperçus WhatsApp/Facebook, Google).

Utilisation (dans le dossier du site) :
    python3 tools/set-domain.py https://mon-site.netlify.app
Puis relance :  python3 tools/make-sitemap.py
"""
import sys, pathlib, re

if len(sys.argv) != 2 or not re.match(r"^https?://[^\s/]+$", sys.argv[1].rstrip("/")):
    sys.exit("Utilisation : python3 tools/set-domain.py https://ton-adresse.com   (sans / à la fin)")

new = sys.argv[1].rstrip("/")
root = pathlib.Path(__file__).resolve().parent.parent
cfg = (root / "js" / "config.js").read_text(encoding="utf-8")
old = re.search(r'domain:\s*"([^"]+)"', cfg).group(1).rstrip("/")

count = 0
for f in list(root.glob("*.html")) + [root / "js" / "config.js", root / "robots.txt", root / "sitemap.xml"]:
    s = f.read_text(encoding="utf-8")
    if old in s:
        f.write_text(s.replace(old, new), encoding="utf-8")
        count += s.count(old)
print(f"{count} occurrence(s) de {old} remplacée(s) par {new}")
