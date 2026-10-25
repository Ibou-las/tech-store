#!/usr/bin/env python3
"""Dependency-light static checks for TECH STORE. Run: python tools/test-site.py"""
from __future__ import annotations
import json, re, subprocess, sys, tempfile, xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
errors: list[str] = []
notes: list[str] = []

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_parts: list[str] = []
        self.in_title = False
        self.ids: list[str] = []
        self.refs: list[tuple[str, str, str]] = []
        self.scripts: list[tuple[dict[str, str | None], str]] = []
        self._script_attrs: dict[str, str | None] | None = None
        self._script_data: list[str] = []
        self.has_html = self.has_head = self.has_body = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html': self.has_html = True
        if tag == 'head': self.has_head = True
        if tag == 'body': self.has_body = True
        if tag == 'title': self.in_title = True
        if a.get('id'): self.ids.append(str(a['id']))
        for attr in ('href', 'src'):
            if a.get(attr): self.refs.append((tag, attr, str(a[attr])))
        if tag == 'script':
            self._script_attrs = a
            self._script_data = []
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'script' and self._script_attrs is not None:
            self.scripts.append((self._script_attrs, ''.join(self._script_data)))
            self._script_attrs = None
            self._script_data = []
    def handle_data(self, data):
        if self.in_title: self.title_parts.append(data)
        if self._script_attrs is not None: self._script_data.append(data)

html_files = sorted(ROOT.glob('*.html'))
for page in html_files:
    parser = PageParser()
    try: parser.feed(page.read_text(encoding='utf-8'))
    except Exception as exc:
        errors.append(f'{page.name}: HTML parser error: {exc}')
        continue
    if not (parser.has_html and parser.has_head and parser.has_body): errors.append(f'{page.name}: missing html/head/body')
    if not ''.join(parser.title_parts).strip(): errors.append(f'{page.name}: missing title')
    duplicates = sorted({i for i in parser.ids if parser.ids.count(i) > 1})
    if duplicates: errors.append(f'{page.name}: duplicate IDs: {", ".join(duplicates)}')
    for tag, attr, value in parser.refs:
        if value.startswith(('#', 'https://', 'http://', 'mailto:', 'tel:', 'data:', 'javascript:')): continue
        path = urlparse(value).path
        if not path: continue
        # Only local file references are checked; URL fragments and query strings are ignored.
        if not (ROOT / path).exists(): errors.append(f'{page.name}: missing local {tag} {attr}: {value}')
    for attrs, code in parser.scripts:
        if attrs.get('src') or attrs.get('type', '').lower() in ('application/ld+json', 'application/json', 'importmap') or not code.strip(): continue
        with tempfile.NamedTemporaryFile('w', suffix='.js', encoding='utf-8', delete=False) as tmp:
            tmp.write(code); tmp_path = Path(tmp.name)
        result = subprocess.run(['node', '--check', str(tmp_path)], capture_output=True, text=True)
        tmp_path.unlink(missing_ok=True)
        if result.returncode: errors.append(f'{page.name}: inline JS syntax: {result.stderr.strip()[:200]}')

js_files = sorted((ROOT / 'js').glob('*.js')) + [ROOT / 'sw.js']
for js in js_files:
    result = subprocess.run(['node', '--check', str(js)], capture_output=True, text=True)
    if result.returncode: errors.append(f'{js.relative_to(ROOT)}: JS syntax: {result.stderr.strip()[:200]}')

for py in (ROOT / 'tools').glob('*.py'):
    result = subprocess.run([sys.executable, '-m', 'py_compile', str(py)], capture_output=True, text=True)
    if result.returncode: errors.append(f'{py.relative_to(ROOT)}: Python syntax: {result.stderr.strip()[:200]}')

try: json.loads((ROOT / 'manifest.webmanifest').read_text(encoding='utf-8'))
except Exception as exc: errors.append(f'manifest.webmanifest invalid JSON: {exc}')
try: ET.parse(ROOT / 'sitemap.xml')
except Exception as exc: errors.append(f'sitemap.xml invalid XML: {exc}')

catalogue_text = (ROOT / 'data/products.js').read_text(encoding='utf-8')
match = re.search(r'window\.TECHSTORE_PRODUCTS\s*=\s*(\[.*?\])\s*;', catalogue_text, re.S)
products = None
try:
    if not match: raise ValueError('assignment window.TECHSTORE_PRODUCTS not found')
    products = json.loads(match.group(1))
    if not isinstance(products, list): raise ValueError('catalogue is not an array')
except Exception as exc: errors.append(f'data/products.js invalid: {exc}')
if isinstance(products, list):
    ids = [p.get('id') for p in products if isinstance(p, dict)]
    if len(ids) != len(set(ids)): errors.append('duplicate product IDs')
    allowed_categories = {'pc', 'smartphones', 'audio', 'gaming', 'montres', 'accessoires'}
    for p in products:
        if not isinstance(p, dict): errors.append('catalogue contains a non-object entry'); continue
        if not isinstance(p.get('id'), str) or not p['id'].strip(): errors.append('product with missing id')
        if not isinstance(p.get('name'), str) or not p['name'].strip(): errors.append(f"{p.get('id','?')}: missing name")
        if not isinstance(p.get('price'), (int, float)) or isinstance(p.get('price'), bool) or p.get('price', -1) < 0: errors.append(f"{p.get('id','?')}: invalid price")
        if p.get('category') not in allowed_categories: errors.append(f"{p.get('id','?')}: invalid category")
        stock = p.get('stock')
        if stock is not None and (not isinstance(stock, int) or isinstance(stock, bool) or stock < 0): errors.append(f"{p.get('id','?')}: invalid stock")
        images = p.get('images', []) or ([p['image']] if p.get('image') else [])
        for image in images:
            if not isinstance(image, str) or not (ROOT / image).is_file(): errors.append(f"{p.get('id','?')}: missing product image {image}")

print('TECH STORE — tests statiques')
print(f'Pages HTML analysées : {len(html_files)}')
print(f'Fichiers JS analysés : {len(js_files)}')
print(f'Produits analysés : {len(products) if isinstance(products, list) else 0}')
if errors:
    print(f'\nÉCHEC : {len(errors)} erreur(s)')
    for item in errors: print('  -', item)
    sys.exit(1)
print('\nRÉUSSITE : aucune erreur statique détectée.')
print('Note : ces tests ne remplacent pas un test interactif dans un vrai navigateur ni un audit de sécurité en production.')
