# TECH STORE — plan de lancement

## Décisions fonctionnelles
- Première publication sur un sous-domaine gratuit.
- Catalogue modifiable à tout moment depuis un tableau de bord connecté.
- Livraison à Dakar et dans les régions, plus retrait en boutique.
- Commandes enregistrées dans la base puis confirmation WhatsApp.
- Aucun prélèvement automatique en ligne ; le mode de paiement choisi est confirmé manuellement.
- Administration évolutive : administrateur principal, gestionnaire de stock, gestionnaire des commandes.

## Développement déjà intégré dans l’archive
- Backend Django REST Framework avec PostgreSQL via Docker Compose et SQLite en développement.
- Modèles catégories, produits, commandes et lignes de commande.
- Authentification JWT, endpoint profil, groupes et permissions.
- API de gestion de produits, photos et stock.
- API de gestion des comptes employés, rôles et désactivation.
- API de commandes avec prix serveur, validation et réservation atomique du stock.
- Annulation autorisée d’une commande avec restitution du stock.
- Tableau de bord pour catalogue, photos, commandes, détails et comptes employés.
- Checkout relié à l’API et message de commande préparé sur WhatsApp.
- Support configurable pour le stockage distant Supabase Storage via S3.
- Contrôles statiques et tests API écrits.

## Étapes obligatoires restantes
1. Installer Docker Desktop ou un environnement Python compatible sur le PC de développement.
2. Lancer PostgreSQL et Django, appliquer les migrations et exécuter les tests API.
3. Corriger tout défaut découvert par les tests d’intégration.
4. Tester le tableau de bord et les rôles avec trois comptes distincts.
5. Tester l’ajout de photos, les URL d’images et le stockage persistant.
6. Ajouter les produits et photos réels depuis le tableau de bord.
7. Créer les comptes gratuits nécessaires pour le frontend, le backend, la base de données et le stockage, puis configurer les variables d’environnement.
8. Déployer le frontend et l’API, régler `apiBase`, CORS, CSP, HTTPS et les domaines autorisés.
9. Compléter les mentions légales et les conditions commerciales réelles.
10. Tester en ligne : ordinateur, Android, panier, commandes, stock, annulation, connexion, permissions, photos, sauvegardes et erreurs réseau.
11. Exécuter le préflight. Ne pas ouvrir au public tant qu’il signale des blocages.

## Limites connues
- L’intégration n’a pas encore été exécutée avec Django/Docker dans l’environnement de création.
- Les produits actuels sont des exemples et ne représentent pas le stock réel.
- Les frais de livraison restent à confirmer.
- Les photos et commandes doivent être sauvegardées ; le stockage distant est prévu, mais doit être configuré et testé.
- L’hébergement gratuit peut imposer mise en veille, limites de stockage et de trafic. Il faudra vérifier les offres au moment de créer les comptes.
- L’absence totale de bugs ou de piratage ne peut pas être promise ; on vise des contrôles, tests, mises à jour et sauvegardes régulières.
