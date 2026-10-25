/* =========================================================
   TECH STORE — CATALOGUE PRODUITS

   Le plus simple : utilise la page admin.html (formulaire + photos).
   Elle réécrit ce fichier pour toi. Tu peux aussi le modifier à la main.

   Chaque produit a :
     id           identifiant unique, sans espace (ex. "p013")
     name         nom affiché
     category     pc | smartphones | audio | gaming | montres | accessoires
     categoryLabel  libellé affiché (ex. "Smartphones")
     price        prix actuel en FCFA, nombre sans espace (ex. 850000)
     oldPrice     ancien prix barré = prix normal si le produit est en promo (sinon null)
     badge        "sale" (Promo), "new" (Nouveau) ou ""
     stock        quantité disponible (0 = rupture, le bouton est désactivé)
     images       liste de photos, la 1re est la principale
                  ex. ["images/products/p013-a1b2.webp", "images/products/p013-c3d4.webp"]
                  (liste vide = image « Photo à venir »)
     description  texte court
     specs        liste de caractéristiques

   ⚠ Les produits ci-dessous sont des EXEMPLES : remplace-les par les tiens.
   ========================================================= */

window.TECHSTORE_PRODUCTS = [
  {
    "id": "p001",
    "name": "MacBook Pro 14\" M3",
    "category": "pc",
    "categoryLabel": "PC & Ordinateurs",
    "price": 1450000,
    "oldPrice": 1650000,
    "badge": "sale",
    "stock": 5,
    "description": "Puissance et autonomie exceptionnelles pour le travail créatif et professionnel. Écran Liquid Retina XDR, puce M3.",
    "specs": [
      "Puce Apple M3",
      "16 Go RAM",
      "512 Go SSD",
      "Écran 14\" Liquid Retina XDR"
    ],
    "images": []
  },
  {
    "id": "p002",
    "name": "iPhone 15 Pro",
    "category": "smartphones",
    "categoryLabel": "Smartphones",
    "price": 850000,
    "oldPrice": null,
    "badge": "new",
    "stock": 8,
    "description": "Châssis en titane, puce A17 Pro et système photo pro pour des images d'une netteté incroyable.",
    "specs": [
      "Puce A17 Pro",
      "128 Go",
      "Appareil photo 48 Mpx",
      "Titane"
    ],
    "images": []
  },
  {
    "id": "p003",
    "name": "Samsung Galaxy S24",
    "category": "smartphones",
    "categoryLabel": "Smartphones",
    "price": 620000,
    "oldPrice": 700000,
    "badge": "sale",
    "stock": 12,
    "description": "Écran Dynamic AMOLED 2X, intelligence artificielle intégrée et autonomie renforcée.",
    "specs": [
      "6.2\" Dynamic AMOLED",
      "256 Go",
      "50 Mpx",
      "5G"
    ],
    "images": []
  },
  {
    "id": "p004",
    "name": "AirPods Pro (2e génération)",
    "category": "audio",
    "categoryLabel": "Audio",
    "price": 165000,
    "oldPrice": null,
    "badge": "",
    "stock": 20,
    "description": "Réduction de bruit active nouvelle génération et son spatial personnalisé.",
    "specs": [
      "Réduction de bruit active",
      "Audio spatial",
      "Boîtier MagSafe",
      "30h d'autonomie"
    ],
    "images": []
  },
  {
    "id": "p005",
    "name": "Casque Sony WH-1000XM5",
    "category": "audio",
    "categoryLabel": "Audio",
    "price": 235000,
    "oldPrice": 270000,
    "badge": "sale",
    "stock": 7,
    "description": "La référence en réduction de bruit, pour une immersion totale en toutes circonstances.",
    "specs": [
      "Réduction de bruit leader",
      "30h d'autonomie",
      "Bluetooth 5.2",
      "Confort longue durée"
    ],
    "images": []
  },
  {
    "id": "p006",
    "name": "Manette PS5 DualSense",
    "category": "gaming",
    "categoryLabel": "Gaming",
    "price": 68000,
    "oldPrice": null,
    "badge": "new",
    "stock": 15,
    "description": "Retour haptique et gâchettes adaptatives pour une immersion totale dans vos jeux.",
    "specs": [
      "Retour haptique",
      "Gâchettes adaptatives",
      "Batterie intégrée",
      "USB-C"
    ],
    "images": []
  },
  {
    "id": "p007",
    "name": "PlayStation 5",
    "category": "gaming",
    "categoryLabel": "Gaming",
    "price": 490000,
    "oldPrice": null,
    "badge": "",
    "stock": 4,
    "description": "Jeux ultra rapides, graphismes 4K saisissants et chargements quasi instantanés.",
    "specs": [
      "SSD ultra rapide",
      "Ray tracing",
      "4K 120fps",
      "1 manette incluse"
    ],
    "images": []
  },
  {
    "id": "p008",
    "name": "Apple Watch Series 9",
    "category": "montres",
    "categoryLabel": "Montres",
    "price": 385000,
    "oldPrice": 420000,
    "badge": "sale",
    "stock": 9,
    "description": "Suivi santé avancé, écran toujours actif et puce S9 plus rapide.",
    "specs": [
      "Puce S9",
      "Écran Always-On",
      "Suivi santé",
      "Résistante à l'eau"
    ],
    "images": []
  },
  {
    "id": "p009",
    "name": "Montre connectée Sport",
    "category": "montres",
    "categoryLabel": "Montres",
    "price": 45000,
    "oldPrice": null,
    "badge": "",
    "stock": 25,
    "description": "Suivi d'activité, notifications et autonomie longue durée pour un prix accessible.",
    "specs": [
      "Suivi cardiaque",
      "Étanche",
      "7 jours d'autonomie",
      "Notifications"
    ],
    "images": []
  },
  {
    "id": "p010",
    "name": "Chargeur rapide 65W USB-C",
    "category": "accessoires",
    "categoryLabel": "Accessoires",
    "price": 15000,
    "oldPrice": null,
    "badge": "",
    "stock": 40,
    "description": "Charge rapide pour smartphones, tablettes et ordinateurs portables compatibles USB-C.",
    "specs": [
      "65W",
      "USB-C",
      "Compact",
      "Charge multi-appareils"
    ],
    "images": []
  },
  {
    "id": "p011",
    "name": "Powerbank 20000mAh",
    "category": "accessoires",
    "categoryLabel": "Accessoires",
    "price": 22000,
    "oldPrice": 28000,
    "badge": "sale",
    "stock": 30,
    "description": "Grande capacité pour recharger vos appareils plusieurs fois, idéal pour les déplacements.",
    "specs": [
      "20000mAh",
      "Charge rapide",
      "Double sortie USB",
      "Compact"
    ],
    "images": []
  },
  {
    "id": "p012",
    "name": "Clavier mécanique RGB",
    "category": "pc",
    "categoryLabel": "PC & Ordinateurs",
    "price": 38000,
    "oldPrice": null,
    "badge": "new",
    "stock": 14,
    "description": "Rétroéclairage RGB personnalisable et switches mécaniques pour une frappe précise.",
    "specs": [
      "Switches mécaniques",
      "RGB personnalisable",
      "Anti-ghosting",
      "USB filaire"
    ],
    "images": []
  }
];
