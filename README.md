# TECH STORE — boutique administrable

TECH STORE est en cours de transformation d’un catalogue HTML statique en boutique avec API, base de données, gestion de stock et administration par rôles. Ce dossier contient le site public, le tableau de bord `manage.html` et le backend Django dans `backend/`.

## Ce qui est inclus dans cette version

- Pages publiques : accueil, catalogue, fiche produit, panier, commande, services, contact, informations légales.
- Catalogue public chargé depuis l’API lorsque le backend est configuré.
- Panier local côté navigateur ; les prix et le stock sont revérifiés côté serveur au moment de créer une commande.
- Création d’une commande en base, numéro de référence, réservation de stock atomique, puis message prérempli WhatsApp.
- Modes de réception : livraison à Dakar, livraison régionale ou retrait en boutique.
- Administration personnalisée : connexion, catalogue, photos, prix, stock, visibilité, commandes et statuts.
- Rôles : administrateur principal, gestionnaire de stock et gestionnaire des commandes.
- API Django REST Framework, PostgreSQL en Docker, SQLite pour développement sans Docker, JWT et limites de requêtes.
- Tests statiques et tests API écrits.

## État et limites à connaître

Cette archive est une **version de développement complète pour continuer les tests**, pas une preuve que le site est déjà en ligne ou prêt à accepter le public. L’API et le tableau de bord doivent encore être exécutés dans un environnement réel pour valider toutes les interactions. Dans cet environnement de création, Django n’est pas installé et Docker n’est pas disponible ; les tests d’intégration Django n’ont donc pas pu être exécutés ici.

Les produits de `data/products.js` sont des données de démonstration. L’API ne reçoit pas automatiquement ton vrai stock : ajoute tes vrais produits depuis `manage.html` une fois le backend démarré. Les photos sont enregistrées localement dans le backend en développement ; un stockage objet persistant devra être configuré avant de déployer le backend sur un hébergement à disque éphémère. Les mentions légales et les conditions de vente doivent être complétées avec les informations exactes de ta boutique.

Aucun système ne peut garantir zéro bug ou zéro piratage. Les tests de ce projet réduisent les risques mais ne remplacent pas un audit professionnel ni des tests en ligne.

## Démarrage local — Windows 11

### 1. Lancer le backend

Installe Docker Desktop si nécessaire, démarre-le, puis ouvre PowerShell dans `backend/`.

```powershell
Copy-Item .env.example .env
```

Ouvre `.env` et remplace `DJANGO_SECRET_KEY` par une longue valeur aléatoire, et `POSTGRES_PASSWORD` par un mot de passe local robuste. Garde `DJANGO_DEBUG=True` uniquement pour les tests locaux. Ne partage jamais `.env`.

Puis lance :

```powershell
docker compose up --build -d
docker compose exec api python manage.py bootstrap_store
docker compose exec api python manage.py createsuperuser
```

Vérifie l’API à `http://127.0.0.1:8000/api/health/`. Les catégories sont créées par `bootstrap_store`. Le superutilisateur est reconnu comme administrateur principal.

### 2. Lancer le frontend

Sers le dossier racine `techstore/` via VS Code Live Server (port 5500) ou un serveur HTTP local. **Ne te contente pas d’ouvrir `index.html` en `file://`** : le navigateur bloque certaines requêtes réseau depuis ce mode.

Dans `js/config.js`, le développement utilise :

```js
apiBase: "http://127.0.0.1:8000/api",
useDemoCatalog: false,
```

Le backend autorise par défaut `localhost:5500` et `127.0.0.1:5500` dans `.env.example`. Ouvre ensuite le site avec Live Server et l’administration sur `manage.html`.

### 3. Connexion à l’administration

Utilise les identifiants du superutilisateur créé à l’étape 1. Tu peux ensuite ajouter les produits, les photos et les quantités réelles. Le tableau de bord crée des comptes employés avec un rôle de stock ou de commandes.

## Déploiement public

Ne déploie pas directement les valeurs de développement. Avant publication :

1. Choisir un hébergement frontend et un hébergement backend compatibles avec le budget et leurs limites gratuites.
2. Configurer le backend avec une `DJANGO_SECRET_KEY` aléatoire, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`, HTTPS, `CORS_ALLOWED_ORIGINS` et `CSRF_TRUSTED_ORIGINS` adaptés aux domaines réels.
3. Utiliser PostgreSQL et configurer le stockage objet Supabase Storage (S3-compatible) pour les images ; le backend refuse le stockage média local en production par défaut, car un disque éphémère peut perdre les photos.
4. Remplacer `apiBase` dans `js/config.js` par l’URL HTTPS réelle de l’API. Ajouter le domaine backend à `connect-src` et les domaines backend + stockage d’images à `img-src` dans les en-têtes CSP de l’hébergement frontend.
5. Configurer sauvegardes de la base et des images, et tester la restauration.
6. Exécuter `python manage.py migrate`, `python manage.py bootstrap_store`, `python manage.py check --deploy` et `python manage.py test`.
7. Exécuter `python tools/test-site.py` puis `python tools/preflight.py`, remplacer les produits de démonstration et compléter les mentions légales.
8. Tester les commandes, la réservation et la restitution du stock, les permissions, les photos, la version mobile, les erreurs réseau et les connexions non autorisées sur le domaine final.

Un hébergement statique gratuit seul ne peut pas faire tourner Django ni stocker les commandes. Le site frontend et l’API doivent être reliés et les domaines autorisés configurés. Les offres gratuites peuvent se mettre en veille, limiter le stockage ou supprimer des fichiers locaux : vérifier les limites des services choisis avant de s’engager dessus.

## Contrôles locaux

Depuis le dossier racine :

```powershell
python tools/test-site.py
python tools/preflight.py
```

Dans `backend/` :

```powershell
python manage.py test
python manage.py check --deploy
```

`check --deploy` peut signaler des réglages de production à compléter tant que les domaines, HTTPS et secrets ne sont pas configurés.

## Architecture du dossier

- `index.html`, `shop.html`, `product.html`, `cart.html`, `checkout.html` : boutique publique.
- `manage.html`, `css/manage.css`, `js/manage.js` : administration connectée à l’API.
- `js/config.js` : coordonnées et URL de l’API.
- `data/products.js` : données d’exemple utilisées seulement comme fichier historique/prévisualisation ; le mode API est prioritaire.
- `backend/` : Django REST Framework, modèles, permissions, migrations, commandes de gestion et tests.
- `tools/` : contrôles et préparation de lancement.
