import uuid
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80, unique=True)),
                ("slug", models.SlugField(blank=True, max_length=90, unique=True)),
                ("active", models.BooleanField(default=True)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order", "name"], "verbose_name_plural": "categories"},
        ),
        migrations.CreateModel(
            name="Order",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("reference", models.CharField(editable=False, max_length=24, unique=True)),
                ("customer_name", models.CharField(max_length=120)),
                ("phone", models.CharField(max_length=24)),
                ("region", models.CharField(blank=True, max_length=80)),
                ("city", models.CharField(blank=True, max_length=80)),
                ("address", models.CharField(blank=True, max_length=240)),
                ("fulfilment", models.CharField(choices=[("dakar_delivery", "Livraison à Dakar"), ("regional_delivery", "Livraison régionale"), ("store_pickup", "Retrait en boutique")], max_length=24)),
                ("customer_note", models.CharField(blank=True, max_length=500)),
                ("status", models.CharField(choices=[("new", "Nouvelle"), ("confirmed", "Confirmée"), ("preparing", "En préparation"), ("shipped", "Expédiée"), ("delivered", "Livrée"), ("cancelled", "Annulée")], default="new", max_length=12)),
                ("subtotal", models.PositiveIntegerField(default=0)),
                ("delivery_fee", models.PositiveIntegerField(blank=True, help_text="Null = à confirmer", null=True)),
                ("total", models.PositiveIntegerField(default=0)),
                ("stock_reserved", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("sku", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=180)),
                ("slug", models.SlugField(blank=True, max_length=200, unique=True)),
                ("description", models.TextField(blank=True)),
                ("specs", models.JSONField(blank=True, default=list)),
                ("price", models.PositiveIntegerField(help_text="Prix de vente en FCFA")),
                ("old_price", models.PositiveIntegerField(blank=True, null=True)),
                ("stock", models.PositiveIntegerField(default=0)),
                ("badge", models.CharField(blank=True, choices=[("", "Aucun"), ("new", "Nouveau"), ("sale", "Promotion")], default="", max_length=8)),
                ("image", models.ImageField(blank=True, null=True, upload_to="products/%Y/%m/")),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="products", to="store.category")),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.CreateModel(
            name="OrderItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("product_name", models.CharField(max_length=180)),
                ("sku", models.CharField(max_length=64)),
                ("unit_price", models.PositiveIntegerField()),
                ("quantity", models.PositiveSmallIntegerField()),
                ("line_total", models.PositiveIntegerField()),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="store.order")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="order_items", to="store.product")),
            ],
        ),
        migrations.AddIndex(model_name="order", index=models.Index(fields=["status", "created_at"], name="store_order_status_6b3d29_idx")),
        migrations.AddIndex(model_name="product", index=models.Index(fields=["active", "category"], name="store_produc_active_8fd33a_idx")),
        migrations.AddIndex(model_name="product", index=models.Index(fields=["name"], name="store_produc_name_4e3b9a_idx")),
    ]
