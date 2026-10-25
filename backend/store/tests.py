from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from .models import Category, Product, Order
from .permissions import OWNER, STOCK, ORDERS

class StoreAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name="Accessoires", slug="accessoires")
        self.product = Product.objects.create(sku="TS-TEST-001", name="Chargeur test", category=self.category, price=10000, stock=3, active=True)

    def test_public_catalog_hides_inactive_products(self):
        Product.objects.create(sku="TS-HIDE-001", name="Masqué", category=self.category, price=1000, stock=1, active=False)
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_order_uses_server_price_and_reserves_stock(self):
        response = self.client.post("/api/orders/", {
            "customer_name": "Client test", "phone": "+221700000000", "fulfilment": "store_pickup",
            "items": [{"product_id": str(self.product.id), "quantity": 2}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.product.refresh_from_db()
        self.assertEqual(response.data["subtotal"], 20000)
        self.assertEqual(self.product.stock, 1)

    def test_order_rejects_insufficient_stock(self):
        response = self.client.post("/api/orders/", {
            "customer_name": "Client test", "phone": "+221700000000", "fulfilment": "store_pickup",
            "items": [{"product_id": str(self.product.id), "quantity": 5}],
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

    def test_product_write_requires_role(self):
        response = self.client.post("/api/products/", {"sku": "X", "name": "X", "category": self.category.pk, "price": 100, "stock": 1}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_owner_group_can_write_products(self):
        user = User.objects.create_user(username="owner", password="A-long-test-password-2026!")
        group, _ = Group.objects.get_or_create(name=OWNER)
        user.groups.add(group)
        self.client.force_authenticate(user=user)
        response = self.client.post("/api/products/", {"sku": "TS-TEST-002", "name": "Clavier", "category": self.category.pk, "price": 15000, "stock": 2, "active": True}, format="json")
        self.assertEqual(response.status_code, 201, getattr(response, "data", None))

    def test_cancel_order_restores_reserved_stock_once(self):
        response = self.client.post("/api/orders/", {
            "customer_name": "Client test", "phone": "+221700000000", "fulfilment": "store_pickup",
            "payment_method": "cash_on_delivery", "items": [{"product_id": str(self.product.id), "quantity": 2}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        order_id = response.data["id"]
        user = User.objects.create_user(username="orders", password="A-long-test-password-2026!")
        group, _ = Group.objects.get_or_create(name=ORDERS)
        user.groups.add(group)
        self.client.force_authenticate(user=user)
        cancelled = self.client.patch(f"/api/orders/{order_id}/", {"status": "cancelled"}, format="json")
        self.assertEqual(cancelled.status_code, 200, cancelled.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)
        repeated = self.client.patch(f"/api/orders/{order_id}/", {"status": "cancelled"}, format="json")
        self.assertEqual(repeated.status_code, 200, repeated.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

    def test_staff_user_management_requires_owner(self):
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, 401)
        owner = User.objects.create_superuser(username="root", email="root@example.test", password="A-long-test-password-2026!")
        self.client.force_authenticate(user=owner)
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(any(row["username"] == "root" and row["role"] == "owner" for row in response.data))
