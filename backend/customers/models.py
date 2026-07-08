from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class CustomerRetentionRecord(models.Model):
    business = models.ForeignKey(
        'accounts.Business', on_delete=models.CASCADE,
        null=True, blank=True, related_name='retention_records'
    )
    date = models.DateField()
    new_customers = models.PositiveIntegerField(default=0)
    returning_customers = models.PositiveIntegerField(default=0)
    total_customers = models.PositiveIntegerField(default=0)
    retention_rate = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text='Percentage of returning customers (auto-calculated)'
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='retention_records'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('business', 'date')
        verbose_name = 'Customer Retention Record'
        verbose_name_plural = 'Customer Retention Records'

    def save(self, *args, **kwargs):
        total = self.new_customers + self.returning_customers
        self.total_customers = total
        if total > 0:
            self.retention_rate = (Decimal(self.returning_customers) / Decimal(total)) * 100
        else:
            self.retention_rate = Decimal('0.00')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.date} — {self.total_customers} customers ({self.retention_rate}% retention)"
