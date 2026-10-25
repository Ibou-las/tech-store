#!/usr/bin/env python3
"""TECH STORE launch gate: check obvious blockers before deploying a static build.
Run from any directory: python tools/preflight.py [site-folder]
This is a practical checklist, not a legal/security certification.
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
blockers: list[str] = []
warnings: list[str] = []

def read(rel: str) -> str:
    p = root / rel
    if not p.exists():
        blockers.append(f"Fichier manquant : {rel}")
        return ""
    return p.read_text(encoding="utf-8", errors="replace")

config = read("js/config.js")
products_js = read("data/products.js")
legal = read("legal.html")
home = read("index.html")
about = read("about.html")
robots = read("robots.txt")

m = re.search(r'window\.TECHSTORE_PRODUCTS\s*=\s*(\[.*?\])\s*;', products_js, re.S)
products = None
if not m:
    blockers.append("Catalogue introuvable ou non lisible dans data/products.js")
else:
    try:
        products = json.loads(m.group(1))
    except Exception as exc:
        blockers.append(f"Catalogue invalide (JSON) : {exc}")

if products is not None:
    if not products:
        blockers.append("Le catalogue est vide")
    ids = [p.get("id") for p in products if isinstance(p, dict)]
    if len(ids) != len(set(ids)):
        blockers.append("Des identifiants produit sont dupliqués")
    bad = []
    for product in products:
        if (not isinstance(product, dict)
            or not isinstance(product.get("price"), (int, float))
            or product.get("price", -1) < 0
            or not isinstance(product.get("name"), str)
            or not product.get("name", "").strip()):
            bad.append(product.get("name", "(sans nom)") if isinstance(product, dict) else "(entrée invalide)")
    if bad:
        blockers.append("Produit(s) avec nom/prix invalide : " + ", ".join(map(str, bad[:5])))
    no_photo = [p.get("name", p.get("id", "?")) for p in products if isinstance(p, dict) and not (p.get("images") or p.get("image"))]
    if no_photo:
        warnings.append(f"{len(no_photo)} produit(s) sans photo réelle (des visuels de remplacement s’afficheront)")
    demo_names = {
        'MacBook Pro 14" M3', "iPhone 15 Pro", "Samsung Galaxy S24",
        "AirPods Pro (2e génération)", "Casque Sony WH-1000XM5",
        "Manette PS5 DualSense", "PlayStation 5", "Apple Watch Series 9",
        "Montre connectée Sport", "Chargeur rapide 65W USB-C",
        "Powerbank 20000mAh", "Clavier mécanique RGB",
    }
    demo = [p for p in products if isinstance(p, dict) and p.get("name") in demo_names]
    if demo:
        blockers.append(f"Le catalogue contient {len(demo)} produit(s) d’exemple (noms de démonstration) : remplacer par le stock réel")

m = re.search(r'domain:\s*["\']([^"\']+)', config)
domain = m.group(1) if m else ""
if not domain or "techstore.sn" in domain.lower() or not domain.startswith("https://"):
    blockers.append("Domaine public non confirmé dans js/config.js (renseigner l’URL HTTPS réellement utilisée)")
api = re.search(r'apiBase:\s*["\']([^"\']+)', config)
if not api or "127.0.0.1" in api.group(1) or "localhost" in api.group(1) or not api.group(1).startswith(("https://", "/api")):
    blockers.append("URL de l’API encore locale ou non configurée pour le domaine public dans js/config.js")
if "techstore.sn" in robots:
    blockers.append("robots.txt référence encore le domaine par défaut techstore.sn")
if re.search(r'à compléter|a completer|TODO|FIXME', legal, re.I):
    blockers.append("Mentions légales/CGV incomplètes : compléter les champs et faire vérifier les clauses avant vente")
if any(name in home for name in ["Awa Diop", "Moussa Ba", "Fatou Sarr"]):
    blockers.append("Des avis clients de démonstration subsistent sur la page d’accueil")
if "data-countdown=\"\"" in home:
    warnings.append("Le compte à rebours promotionnel est désactivé (normal si aucune offre datée n’est prévue)")
if not (root / "_headers").exists():
    warnings.append("Pas de fichier _headers Netlify : les en-têtes de sécurité ne seront pas configurés par ce dépôt")

print(f"TECH STORE — contrôle avant publication\nDossier : {root}\n")
if blockers:
    print(f"BLOQUANTS ({len(blockers)})")
    for item in blockers: print(f"  [BLOQUANT] {item}")
else:
    print("Aucun blocage automatique détecté.")
if warnings:
    print(f"\nÀ VÉRIFIER ({len(warnings)})")
    for item in warnings: print(f"  [À VÉRIFIER] {item}")
print("\nCe contrôle ne remplace ni les tests en ligne, ni une revue juridique, ni un audit de sécurité professionnel.")
sys.exit(1 if blockers else 0)
