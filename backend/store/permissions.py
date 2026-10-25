from rest_framework.permissions import BasePermission, SAFE_METHODS

OWNER = "TECH_STORE_OWNER"
STOCK = "TECH_STORE_STOCK"
ORDERS = "TECH_STORE_ORDERS"

def is_owner(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.groups.filter(name=OWNER).exists()))

def has_role(user, *roles):
    return bool(user and user.is_authenticated and (user.is_superuser or user.groups.filter(name__in=roles).exists()))

class ProductPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return has_role(request.user, OWNER, STOCK)

class OrderPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method == "POST" and getattr(view, "action", "") == "create":
            return True
        return has_role(request.user, OWNER, ORDERS)
