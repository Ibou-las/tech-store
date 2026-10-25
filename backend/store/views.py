from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from .models import Category, Product, Order, OrderItem
from .serializers import CategorySerializer, ProductSerializer, OrderCreateSerializer, OrderSerializer
from .permissions import ProductPermission, OrderPermission, is_owner, has_role, OWNER, STOCK, ORDERS
from .throttles import OrderCreateThrottle

class HealthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = []
    def get(self, request):
        return Response({"status": "ok", "service": "TECH STORE API"})

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [ProductPermission]
    queryset = Category.objects.all()
    def get_queryset(self):
        qs = Category.objects.all()
        if self.request.method in ("GET", "HEAD", "OPTIONS") and not self.request.user.is_authenticated:
            return qs.filter(active=True)
        if not has_role(self.request.user, OWNER, STOCK):
            return qs.filter(active=True)
        return qs

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [ProductPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "sku", "category__name"]
    ordering_fields = ["price", "name", "updated_at"]
    queryset = Product.objects.select_related("category").all()
    def get_queryset(self):
        qs = Product.objects.select_related("category").all()
        if not has_role(self.request.user, OWNER, STOCK):
            qs = qs.filter(active=True)
        category = self.request.query_params.get("category")
        if category: qs = qs.filter(category__slug=category)
        available = self.request.query_params.get("available")
        if available == "true": qs = qs.filter(stock__gt=0)
        return qs

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [OrderPermission]
    http_method_names = ["get", "post", "patch", "head", "options"]
    def get_throttles(self):
        if getattr(self, "action", None) == "create":
            return [OrderCreateThrottle()]
        return super().get_throttles()
    def get_queryset(self):
        qs = Order.objects.prefetch_related("items").all()
        if is_owner(self.request.user) or has_role(self.request.user, ORDERS): return qs
        raise PermissionDenied("Accès réservé aux gestionnaires de commandes.")

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        requested = {}
        for item in data["items"]:
            pid = str(item["product_id"])
            requested[pid] = requested.get(pid, 0) + item["quantity"]
        if len(requested) > 30:
            raise ValidationError({"items": "Une commande ne peut pas contenir plus de 30 produits différents."})
        with transaction.atomic():
            products = list(Product.objects.select_for_update().filter(id__in=requested.keys(), active=True))
            by_id = {str(p.id): p for p in products}
            missing = [pid for pid in requested if pid not in by_id]
            if missing: raise ValidationError({"items": "Un ou plusieurs produits ne sont plus disponibles. Actualisez le panier."})
            for pid, qty in requested.items():
                if by_id[pid].stock < qty:
                    raise ValidationError({"stock": f"Stock insuffisant pour {by_id[pid].name}. Quantité disponible : {by_id[pid].stock}."})
            order = Order.objects.create(
                customer_name=data["customer_name"].strip(), phone=data["phone"].strip(),
                region=data.get("region", "").strip(), city=data.get("city", "").strip(),
                address=data.get("address", "").strip(), fulfilment=data["fulfilment"],
                payment_method=data.get("payment_method", Order.PaymentMethod.COD),
                customer_note=data.get("customer_note", "").strip(), status=Order.Status.NEW,
                delivery_fee=None,
            )
            subtotal = 0
            for pid, qty in requested.items():
                p = by_id[pid]
                line = p.price * qty
                OrderItem.objects.create(order=order, product=p, product_name=p.name, sku=p.sku, unit_price=p.price, quantity=qty, line_total=line)
                p.stock -= qty
                p.save(update_fields=["stock", "updated_at"])
                subtotal += line
            order.subtotal = subtotal
            order.total = subtotal  # livraison à confirmer; ne pas inventer de frais
            order.save(update_fields=["subtotal", "total", "updated_at"])
        return Response(OrderSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if not (is_owner(request.user) or has_role(request.user, ORDERS)):
            raise PermissionDenied("Accès réservé aux gestionnaires de commandes.")
        order = self.get_object()
        new_status = request.data.get("status")
        allowed = {choice for choice, _label in Order.Status.choices}
        if new_status not in allowed:
            raise ValidationError({"status": "Statut invalide."})
        if order.status == Order.Status.CANCELLED and new_status != Order.Status.CANCELLED:
            raise ValidationError({"status": "Une commande annulée ne peut pas être réactivée directement."})
        transitions = {
            Order.Status.NEW: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
            Order.Status.CONFIRMED: {Order.Status.PREPARING, Order.Status.CANCELLED},
            Order.Status.PREPARING: {Order.Status.SHIPPED, Order.Status.CANCELLED},
            Order.Status.SHIPPED: {Order.Status.DELIVERED},
            Order.Status.DELIVERED: set(),
            Order.Status.CANCELLED: set(),
        }
        if new_status != order.status and new_status not in transitions[order.status]:
            raise ValidationError({"status": "Transition de statut non autorisée."})
        if new_status == Order.Status.CANCELLED and order.status != Order.Status.CANCELLED:
            from django.db.models import F
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=order.pk)
                # Vérifier à nouveau après verrouillage pour éviter une double restitution du stock.
                if order.status not in transitions or new_status not in transitions[order.status]:
                    raise ValidationError({"status": "La commande a changé entre-temps. Actualisez la page."})
                if order.stock_reserved:
                    for item in order.items.all():
                        Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)
                    order.stock_reserved = False
                order.status = new_status
                order.save(update_fields=["status", "stock_reserved", "updated_at"])
        else:
            order.status = new_status
            order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order, context={"request": request}).data)
