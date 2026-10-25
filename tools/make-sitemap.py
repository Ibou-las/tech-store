#!/usr/bin/env python3
"""Régénère sitemap.xml, robots.txt et la liste des fichiers frontend.

Utilisation (dans le dossier du site) :   python3 tools/make-sitemap.py
Relance-le après avoir configuré le domaine. Les fiches produits dynamiques ne sont pas ajoutées au sitemap statique.
"""
import json, re, pathlib
from datetime import date

root = pathlib.Path(__file__).resolve().parent.parent
cfg = (root / "js" / "config.js").read_text(encoding="utf-8")
domain = re.search(r'domain:\s*"([^"]+)"', cfg).group(1).rstrip("/")

today = date.today().isoformat()
pages = [("", "1.0"), ("shop.html", "0.9"), ("services.html", "0.7"), ("about.html", "0.5"), ("contact.html", "0.5"), ("legal.html", "0.3")]
urls = [(f"{domain}/{p}", prio) for p, prio in pages]

xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for loc, prio in urls:
    xml.append(f"  <url><loc>{loc.replace('&', '&amp;')}</loc><lastmod>{today}</lastmod><priority>{prio}</priority></url>")
xml.append("</urlset>")
(root / "sitemap.xml").write_text("\n".join(xml) + "\n", encoding="utf-8")
(root / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /cart.html\nDisallow: /checkout.html\nDisallow: /admin.html\nDisallow: /manage.html\n\nSitemap: {domain}/sitemap.xml\n", encoding="utf-8")
print(f"sitemap.xml et robots.txt mis à jour : {len(urls)} adresses pour {domain}")

# liste des fichiers frontend seulement
skip_names = {"README.md", "AUDIT-TECH-STORE.md", "PLAN-LANCEMENT-TECH-STORE.md", ".DS_Store", "LISEZ-MOI.txt"}
files = []
for f in sorted(root.rglob("*")):
    rel = f.relative_to(root).as_posix()
    if not f.is_file() or f.name in skip_names or rel.startswith(("tools/", "backend/", "images/products/", ".")) or "__pycache__" in rel:
        continue
    files.append(rel)
(root / "js" / "site-files.js").write_text(
    "/* Liste des fichiers frontend seulement.\n"
    "   Mise à jour automatiquement par tools/make-sitemap.py. */\n"
    "window.TECHSTORE_SITE_FILES = " + json.dumps(files, indent=2) + ";\n", encoding="utf-8")
print(f"js/site-files.js mis à jour : {len(files)} fichiers")
