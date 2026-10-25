from django.contrib.auth.models import Group, Permission
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from .permissions import OWNER, STOCK, ORDERS

@receiver(post_migrate)
def create_default_role_groups(sender, **kwargs):
    if sender.name != "store": return
    for name in (OWNER, STOCK, ORDERS):
        Group.objects.get_or_create(name=name)
