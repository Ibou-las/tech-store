import uuid
from django.conf import settings
from django.db import models
from django.utils.text import slugify

class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self): return self.name

class Product(models.Model):
    class Badge(models.TextChoices):
        NONE = "", "Aucun"
        NEW = "new", "Nouveau"
        SALE = "sale", "Promotion"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sku = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    description = models.TextField(blank=True)
    specs = models.JSONField(default=list, blank=True)
    price = models.PositiveIntegerField(help_text="Prix de vente en FCFA")
    old_price = models.PositiveIntegerField(null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    badge = models.CharField(max_length=8, choices=Badge.choices, blank=True, default="")
    image = models.ImageField(upload_to="products/%Y/%m/", blank=True, null=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["active", "category"]), models.Index(fields=["name"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:180] or "produit"
            candidate = base
            i = 2
            while Product.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}-{i}"; i += 1
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self): return f"{self.name} ({self.sku})"

class Order(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "Nouvelle"
        CONFIRMED = "confirmed", "Confirmée"
        PREPARING = "preparing", "En préparation"
        SHIPPED = "shipped", "Expédiée"
        DELIVERED = "delivered", "Livrée"
        CANCELLED = "cancelled", "Annulée"

    class Fulfilment(models.TextChoices):
        DAKAR = "dakar_delivery", "Livraison à Dakar"
        REGION = "regional_delivery", "Livraison régionale"
        PICKUP = "store_pickup", "Retrait en boutique"

    class PaymentMethod(models.TextChoices):
        COD = "cash_on_delivery", "Paiement à la livraison"
        WAVE = "wave", "Wave à confirmer"
        ORANGE_MONEY = "orange_money", "Orange Money à confirmer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=24, unique=True, editable=False)
    customer_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=24)
    region = models.CharField(max_length=80, blank=True)
    city = models.CharField(max_length=80, blank=True)
    address = models.CharField(max_length=240, blank=True)
    fulfilment = models.CharField(max_length=24, choices=Fulfilment.choices)
    payment_method = models.CharField(max_length=24, choices=PaymentMethod.choices, default=PaymentMethod.COD)
    customer_note = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW)
    subtotal = models.PositiveIntegerField(default=0)
    delivery_fee = models.PositiveIntegerField(null=True, blank=True, help_text="Null = à confirmer")
    total = models.PositiveIntegerField(default=0)
    stock_reserved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]

    def save(self, *args, **kwargs):
        if not self.reference:
            from django.utils import timezone
            self.reference = "TS-" + timezone.now().strftime("%y%m%d") + "-" + uuid.uuid4().hex[:6].upper()
        super().save(*args, **kwargs)

    def __str__(self): return self.reference

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    product_name = models.CharField(max_length=180)
    sku = models.CharField(max_length=64)
    unit_price = models.PositiveIntegerField()
    quantity = models.PositiveSmallIntegerField()
    line_total = models.PositiveIntegerField()

    def __str__(self): return f"{self.product_name} × {self.quantity}"
