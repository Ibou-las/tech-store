from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from .permissions import is_owner, OWNER, STOCK, ORDERS

User = get_user_model()
ROLE_MAP = {"owner": OWNER, "stock": STOCK, "orders": ORDERS}

class StaffUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def _require_owner(self, request):
        if not is_owner(request.user):
            raise PermissionDenied("Seul l’administrateur principal peut gérer les comptes.")

    def get(self, request):
        self._require_owner(request)
        rows = []
        for user in User.objects.prefetch_related("groups").order_by("username"):
            groups = set(user.groups.values_list("name", flat=True))
            role = "owner" if user.is_superuser else next((key for key, value in ROLE_MAP.items() if value in groups), "none")
            rows.append({"id": user.pk, "username": user.username, "email": user.email,
                         "is_active": user.is_active, "role": role,
                         "last_login": user.last_login, "date_joined": user.date_joined})
        return Response(rows)

    def post(self, request):
        self._require_owner(request)
        username = str(request.data.get("username", "")).strip()
        email = str(request.data.get("email", "")).strip()
        password = request.data.get("password", "")
        role = request.data.get("role", "stock")
        if not username or len(username) > 150:
            raise ValidationError({"username": "Nom d’utilisateur obligatoire (150 caractères maximum)."})
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError({"username": "Ce nom d’utilisateur existe déjà."})
        if role not in {"stock", "orders"}:
            raise ValidationError({"role": "Un employé doit avoir le rôle stock ou orders. Le rôle principal est attribué séparément."})
        candidate = User(username=username, email=email)
        try:
            validate_password(password, user=candidate)
        except DjangoValidationError as exc:
            raise ValidationError({"password": list(exc.messages)})
        user = User.objects.create_user(username=username, email=email, password=password)
        group, _ = Group.objects.get_or_create(name=ROLE_MAP[role])
        user.groups.add(group)
        return Response({"id": user.pk, "username": user.username, "email": user.email,
                         "is_active": user.is_active, "role": role}, status=status.HTTP_201_CREATED)

    def patch(self, request):
        self._require_owner(request)
        user_id = request.data.get("id")
        try:
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, TypeError, ValueError):
            raise ValidationError({"id": "Compte introuvable."})
        if user.pk == request.user.pk and request.data.get("is_active") is False:
            raise ValidationError({"is_active": "Tu ne peux pas désactiver ton propre compte."})
        if "is_active" in request.data:
            user.is_active = bool(request.data["is_active"])
            user.save(update_fields=["is_active"])
        if "role" in request.data:
            role = request.data["role"]
            if role not in {"stock", "orders"}:
                raise ValidationError({"role": "Rôle employé invalide."})
            user.groups.clear()
            group, _ = Group.objects.get_or_create(name=ROLE_MAP[role])
            user.groups.add(group)
        groups = set(user.groups.values_list("name", flat=True))
        role = next((key for key, value in ROLE_MAP.items() if value in groups), "none")
        return Response({"id": user.pk, "username": user.username, "email": user.email,
                         "is_active": user.is_active, "role": role})
