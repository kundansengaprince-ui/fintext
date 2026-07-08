from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class SalesRecord(models.Model):
    business = models.ForeignKey(
        'accounts.Business', on_delete=models.CASCADE,
        null=True, blank=True, related_name='sales_records'
    )
    date = models.DateField()
    total_sales = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))]
    )
    num_transactions = models.PositiveIntegerField(default=0)
    avg_transaction_value = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    food_sales = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))]
    )
    beverage_sales = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))]
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='sales_records'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('business', 'date')
        verbose_name = 'Sales Record'
        verbose_name_plural = 'Sales Records'

    def save(self, *args, **kwargs):
        if self.num_transactions > 0:
            self.avg_transaction_value = self.total_sales / self.num_transactions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Sales on {self.date}: RWF {self.total_sales:,.0f}"
