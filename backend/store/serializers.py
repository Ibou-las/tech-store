from rest_framework import serializers
from .models import Category, Product, Order, OrderItem

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "active", "sort_order"]

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    image_url = serializers.SerializerMethodField()
    class Meta:
        model = Product
        fields = ["id", "sku", "name", "slug", "category", "category_name", "category_slug", "description", "specs", "price", "old_price", "stock", "badge", "image", "image_url", "active", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "created_at", "updated_at", "image_url"]
    def get_image_url(self, obj):
        request = self.context.get("request")
        if not obj.image: return None
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url
    def validate_image(self, image):
        if image and image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("La photo ne doit pas dépasser 5 Mo.")
        if image and getattr(image, "content_type", "") not in {"image/jpeg", "image/png", "image/webp"}:
            raise serializers.ValidationError("Formats autorisés : JPEG, PNG ou WebP.")
        return image
    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        if price is not None and price < 1:
            raise serializers.ValidationError({"price": "Le prix doit être supérieur à zéro FCFA."})
        old = attrs.get("old_price", getattr(self.instance, "old_price", None))
        if old is not None and price is not None and old <= price:
            raise serializers.ValidationError({"old_price": "L'ancien prix doit être supérieur au prix actuel."})
        return attrs

class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=20)

class OrderCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=120)
    phone = serializers.RegexField(r"^[+0-9() .-]{8,24}$", max_length=24)
    region = serializers.CharField(max_length=80, required=False, allow_blank=True)
    city = serializers.CharField(max_length=80, required=False, allow_blank=True)
    address = serializers.CharField(max_length=240, required=False, allow_blank=True)
    fulfilment = serializers.ChoiceField(choices=Order.Fulfilment.choices)
    payment_method = serializers.ChoiceField(choices=Order.PaymentMethod.choices, default=Order.PaymentMethod.COD)
    customer_note = serializers.CharField(max_length=500, required=False, allow_blank=True)
    items = OrderItemInputSerializer(many=True, allow_empty=False)

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["product_name", "sku", "unit_price", "quantity", "line_total"]

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    class Meta:
        model = Order
        fields = ["id", "reference", "customer_name", "phone", "region", "city", "address", "fulfilment", "payment_method", "customer_note", "status", "subtotal", "delivery_fee", "total", "items", "created_at", "updated_at"]
        read_only_fields = fields
