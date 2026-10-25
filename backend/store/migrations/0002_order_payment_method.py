from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("store", "0001_initial")]
    operations = [
        migrations.AddField(
            model_name="order",
            name="payment_method",
            field=models.CharField(
                choices=[("cash_on_delivery", "Paiement à la livraison"), ("wave", "Wave à confirmer"), ("orange_money", "Orange Money à confirmer")],
                default="cash_on_delivery", max_length=24,
            ),
        ),
    ]
