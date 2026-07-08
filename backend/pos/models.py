from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class MenuItem(models.Model):
    class Category(models.TextChoices):
        FOOD      = 'food',      'Food'
        BEVERAGE  = 'beverage',  'Beverage'
        OTHER     = 'other',     'Other'

    business = models.ForeignKey(
        'accounts.Business', on_delete=models.CASCADE, related_name='menu_items'
    )
    name          = models.CharField(max_length=100)
    category      = models.CharField(max_length=20, choices=Category.choices, default=Category.FOOD)
    price         = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    # Which inventory item gets decremented when this is sold, and by how much
    inventory_item = models.ForeignKey(
        'inventory.InventoryItem', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='menu_items'
    )
    inventory_qty_per_sale = models.DecimalField(
        max_digits=8, decimal_places=3, default=1,
        help_text='How many inventory units are consumed per 1 sale of this item'
    )
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} — RWF {self.price}"


class Transaction(models.Model):
    class Status(models.TextChoices):
        OPEN      = 'open',      'Open'
        COMPLETED = 'completed', 'Completed'
        VOIDED    = 'voided',    'Voided'

    business   = models.ForeignKey('accounts.Business', on_delete=models.CASCADE, related_name='transactions')
    date       = models.DateField()
    total      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    notes      = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Txn #{self.id} — RWF {self.total} on {self.date}"


class TransactionItem(models.Model):
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='items')
    menu_item   = models.ForeignKey(MenuItem, on_delete=models.PROTECT)
    quantity    = models.PositiveIntegerField(default=1)
    unit_price  = models.DecimalField(max_digits=10, decimal_places=2)  # snapshot at time of sale
    subtotal    = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name}"
