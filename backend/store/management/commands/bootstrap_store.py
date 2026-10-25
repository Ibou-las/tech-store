import os
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from store.models import Category
from store.permissions import OWNER, STOCK, ORDERS

CATEGORIES = [
    ("PC & Ordinateurs", "pc", 1),
    ("Smartphones", "smartphones", 2),
    ("Audio", "audio", 3),
    ("Gaming", "gaming", 4),
    ("Montres connectées", "montres", 5),
    ("Accessoires", "accessoires", 6),
]

class Command(BaseCommand):
    help = "Crée les catégories TECH STORE et, si configuré, le compte administrateur initial."

    def handle(self, *args, **options):
        for name, slug, order in CATEGORIES:
            Category.objects.update_or_create(slug=slug, defaults={"name": name, "active": True, "sort_order": order})
        for role in (OWNER, STOCK, ORDERS):
            Group.objects.get_or_create(name=role)
        username = os.getenv("TECHSTORE_OWNER_USERNAME", "").strip()
        email = os.getenv("TECHSTORE_OWNER_EMAIL", "").strip()
        password = os.getenv("TECHSTORE_OWNER_PASSWORD", "")
        if username or password:
            if not (username and password):
                raise CommandError("Définir TECHSTORE_OWNER_USERNAME et TECHSTORE_OWNER_PASSWORD ensemble.")
            User = get_user_model()
            if User.objects.filter(username=username).exists():
                self.stdout.write(self.style.WARNING(f"Le compte {username} existe déjà ; aucun mot de passe modifié."))
            else:
                user = User.objects.create_superuser(username=username, email=email, password=password)
                user.groups.add(Group.objects.get(name=OWNER))
                self.stdout.write(self.style.SUCCESS(f"Compte administrateur créé : {username}"))
        self.stdout.write(self.style.SUCCESS("Catégories et rôles TECH STORE prêts."))
