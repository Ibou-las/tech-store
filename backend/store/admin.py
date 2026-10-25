from django.contrib import admin
from .models import Category, Product, Order, OrderItem

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "active", "sort_order")
    prepopulated_fields = {"slug": ("name",)}
    list_filter = ("active",)
    search_fields = ("name",)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "category", "price", "stock", "active", "updated_at")
    list_filter = ("category", "active", "badge")
    search_fields = ("name", "sku", "description")
    readonly_fields = ("id", "created_at", "updated_at")
    list_editable = ("price", "stock", "active")

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "product_name", "sku", "unit_price", "quantity", "line_total")

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("reference", "customer_name", "phone", "status", "total", "fulfilment", "created_at")
    list_filter = ("status", "fulfilment", "created_at")
    search_fields = ("reference", "customer_name", "phone")
    readonly_fields = ("reference", "status", "subtotal", "delivery_fee", "total", "stock_reserved", "created_at", "updated_at")
    inlines = [OrderItemInline]
    def has_add_permission(self, request): return False
