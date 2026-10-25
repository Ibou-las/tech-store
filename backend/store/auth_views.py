from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .permissions import is_owner, has_role, STOCK, ORDERS

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        role = 'owner' if is_owner(user) else 'stock' if has_role(user, STOCK) else 'orders' if has_role(user, ORDERS) else 'none'
        return Response({"id": user.pk, "username": user.username, "email": user.email, "role": role, "is_active": user.is_active})
