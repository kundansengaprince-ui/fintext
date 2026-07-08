from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class InventoryItem(models.Model):
    class Unit(models.TextChoices):
        KG = 'kg', 'Kilogram'
        LITRE = 'L', 'Litre'
        PIECE = 'pcs', 'Piece'
        BOTTLE = 'btl', 'Bottle'
        BOX = 'box', 'Box'
        PACK = 'pck', 'Pack'

    business = models.ForeignKey(
        'accounts.Business', on_delete=models.CASCADE,
        null=True, blank=True, related_name='inventory_items'
    )
    name = models.CharField(max_length=100)
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.PIECE)
    reorder_level = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text='Minimum quantity before restocking is needed'
    )
    unit_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Inventory Item'
        verbose_name_plural = 'Inventory Items'

    def __str__(self):
        return f"{self.name} ({self.unit})"


class InventoryRecord(models.Model):
    business = models.ForeignKey(
        'accounts.Business', on_delete=models.CASCADE,
        null=True, blank=True, related_name='inventory_records'
    )
    date = models.DateField()
    item = models.ForeignKey(
        InventoryItem, on_delete=models.PROTECT, related_name='records'
    )
    opening_quantity = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))]
    )
    quantity_received = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    quantity_used = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    closing_quantity = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    wastage = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='inventory_records'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('business', 'date', 'item')
        verbose_name = 'Inventory Record'
        verbose_name_plural = 'Inventory Records'

    def save(self, *args, **kwargs):
        self.closing_quantity = (
            self.opening_quantity + self.quantity_received - self.quantity_used - self.wastage
        )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item.name} on {self.date} — closing: {self.closing_quantity} {self.item.unit}"
