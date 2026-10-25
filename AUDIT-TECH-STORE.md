# TECH STORE — rapport d’état après intégration du backend

Date : 25 octobre 2026. Version : développement local, non publiée.

## Résumé

Le projet comprend maintenant le site public, un tableau de bord personnalisé `manage.html` et un backend Django REST Framework. Le frontend appelle l’API pour charger le catalogue et pour enregistrer les commandes. L’administration utilise JWT, gère les produits et photos, les statuts de commande et les comptes employés. Les rôles sont administrateur principal, gestionnaire de stock et gestionnaire des commandes.

**Verdict : base fonctionnelle développée, mais pas encore validée en exécution réelle ni prête à être ouverte au public.** Les tests statiques passent. Les tests Django, le test de navigation et les tests de bout en bout n’ont pas pu être exécutés dans l’environnement de création, car Django n’y est pas installé et Docker n’y est pas disponible.

## Fonctions intégrées

- Catalogue public chargé depuis l’API quand `apiBase` est configuré ; aucune bascule silencieuse vers les données de démonstration si l’API échoue.
- Administration connectée à l’API : ajout/modification de produits, catégorie, prix, ancien prix, stock, visibilité, caractéristiques et photo principale.
- Connexion JWT, profil connecté et renouvellement du jeton.
- Gestion des comptes employés et rôles côté serveur ; création, changement de rôle et désactivation par l’administrateur principal.
- Tableau des commandes avec détails des articles et coordonnées, et transitions de statut contrôlées.
- API de commande : les prix proviennent de la base de données, le stock est vérifié et réservé dans une transaction ; l’annulation autorisée restitue le stock.
- Checkout avec choix de livraison Dakar/région/retrait, région du Sénégal, choix de paiement à confirmer manuellement et ouverture WhatsApp après enregistrement serveur.
- Limitation de débit de création de commande et de connexion.
- Configuration optionnelle du stockage S3-compatible pour les photos, compatible avec Supabase Storage ; le stockage média local est refusé en production par défaut.
- L’ancienne page `admin.html` redirige vers `manage.html` pour éviter de confondre l’ancien éditeur local avec l’administration connectée.

## Vérifications réellement effectuées

- `python tools/test-site.py` : réussite, 11 pages HTML analysées, 9 fichiers JavaScript analysés, 12 produits d’exemple détectés.
- `node --check` sur `js/manage.js`, `js/main.js` et `js/cart.js` : réussite.
- `python -m py_compile` sur les fichiers Python du projet : réussite.
- Validation du ZIP généré : archive lisible, aucune erreur CRC.
- `python tools/preflight.py` : bloque la publication pour les raisons attendues ci-dessous.

**Non exécutés :** tests Django, migrations en base réelle, upload de photos, tests de connexion, test visuel dans Edge/Chrome, parcours commande WhatsApp sur téléphone, tests de sécurité sur le domaine public. Le code de tests API existe, mais il faut l’exécuter sur un environnement avec les dépendances installées.

## Bloquants avant publication

1. **Produits réels** : les 12 produits actuels dans `data/products.js` sont des exemples. Ils ne sont pas automatiquement importés dans la base de données. Ajouter les articles, prix, quantités et caractéristiques réels dans le tableau de bord.
2. **Photos** : les exemples n’ont pas de vraies photos produit. Ajouter les photos réelles et configurer le stockage distant.
3. **URL du backend** : `js/config.js` pointe actuellement vers `http://127.0.0.1:8000/api`. Remplacer cette adresse par l’URL HTTPS du backend en ligne, puis ajuster CORS et CSP.
4. **Domaine public** : `https://www.techstore.sn` est encore une valeur par défaut dans certaines métadonnées, le sitemap et la configuration. Remplacer par le vrai sous-domaine attribué par l’hébergeur et régénérer le sitemap.
5. **Stockage de photos en production** : configurer Supabase Storage S3-compatible et garder les clés privées uniquement dans les variables d’environnement du backend. Vérifier les URL publiques des images et la politique de lecture du bucket.
6. **Secrets et production** : créer une clé Django unique, `DEBUG=False`, domaines autorisés, CORS/CSRF, HTTPS, HSTS, sauvegardes et journalisation.
7. **Mentions légales et vente** : compléter les informations exactes de la boutique et vérifier les clauses applicables au Sénégal.
8. **Conditions opérationnelles** : confirmer les frais de livraison, les délais, le retrait en boutique et la procédure pour les commandes non confirmées.

## Limites opérationnelles importantes

- La commande est enregistrée et le stock réservé avant que le client envoie effectivement le message WhatsApp. Les commandes non confirmées doivent être suivies et annulées par un employé autorisé pour restituer le stock.
- Le site ne prélève pas de paiement en ligne. Le moyen choisi est enregistré comme préférence à confirmer avec la boutique.
- Les frais de livraison restent à confirmer ; le total serveur correspond au sous-total des produits tant que les frais ne sont pas configurés.
- Le mode de stockage local des photos sert au développement. Le stockage distant est prévu par configuration mais n’a pas été testé avec un vrai projet Supabase.
- Le site et l’API sont encore deux services à déployer et relier. Aucun site n’a été publié par ce travail.
- Aucun système ne peut garantir zéro bug ou zéro risque de piratage. Un test de bout en bout et une revue de sécurité restent nécessaires.

## Contrôle avant publication

Depuis le dossier racine `TECH-STORE` :

```powershell
python tools/test-site.py
python tools/preflight.py
```

Dans `backend/` après installation des dépendances :

```powershell
python manage.py migrate
python manage.py bootstrap_store
python manage.py test
python manage.py check --deploy
```

Le préflight doit bloquer tant que les produits réels, le domaine, l’URL API et les mentions légales ne sont pas configurés.
