# TECH STORE API — Django REST Framework

## Fonctionnalités
- Catalogue et catégories stockés en base de données.
- Lecture publique des produits et catégories actifs.
- Création/modification des produits limitée aux rôles administrateur principal et gestionnaire de stock.
- Upload de photos JPEG/PNG/WebP limité à 5 Mo.
- Authentification JWT avec access token court, refresh token rotatif et limitation de tentatives de connexion.
- Endpoint `/api/auth/me/` pour le profil et le rôle connecté.
- Endpoint `/api/users/` réservé à l’administrateur principal pour lister/créer/désactiver les comptes employés.
- Création publique de commande limitée en débit, prix calculés côté serveur, stock contrôlé et réservé dans une transaction.
- Transitions de statut de commande contrôlées ; l’annulation autorisée restitue le stock une seule fois.
- PostgreSQL dans Docker Compose ; SQLite si `DATABASE_URL` est vide en développement.

## Démarrage Windows 11 avec Docker

Depuis ce dossier :

```powershell
Copy-Item .env.example .env
```

Remplace `DJANGO_SECRET_KEY` et `POSTGRES_PASSWORD` dans `.env`. N’utilise jamais ces valeurs de démonstration en production. Puis :

```powershell
docker compose up --build -d
docker compose exec api python manage.py bootstrap_store
docker compose exec api python manage.py createsuperuser
```

Endpoints : `http://127.0.0.1:8000/api/health/`, `/api/categories/`, `/api/products/`. Le média local est servi seulement en mode debug et est monté dans un volume Docker pour le développement.

## Tests

```powershell
python manage.py test
python manage.py check --deploy
```

## Endpoints
- `GET /api/health/`
- `GET /api/categories/`
- `GET /api/products/` — public, produits actifs seulement
- `POST/PATCH/DELETE /api/products/` — administrateur ou gestionnaire de stock
- `POST /api/auth/token/` et `POST /api/auth/token/refresh/`
- `GET /api/auth/me/` — profil et rôle du compte connecté
- `GET/POST/PATCH /api/users/` — administrateur principal uniquement
- `POST /api/orders/` — création publique, prix et stock vérifiés côté serveur
- `GET /api/orders/` — administrateur principal ou gestionnaire des commandes
- `PATCH /api/orders/<uuid>/` — transitions autorisées de statut

## Déploiement

Ne pas utiliser `DEBUG=True` en production. Définir une clé secrète unique, `DEBUG=False`, les domaines autorisés, les origines CORS/CSRF, HTTPS/HSTS et PostgreSQL. Configure un bucket Supabase Storage public en lecture et privé en écriture, puis le stockage S3-compatible du backend via `SUPABASE_URL`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` et la région réelle `AWS_S3_REGION_NAME`. Ne place jamais les identifiants privés dans le frontend. Le backend refuse le stockage média local en production par défaut, car le disque peut être éphémère. Prévois des sauvegardes cloud. La création de commande réserve le stock avant que le client envoie le message WhatsApp ; les commandes non confirmées doivent être surveillées et annulées par un employé autorisé afin de restituer les quantités.
