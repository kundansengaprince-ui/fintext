from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class BusinessHealthScore(models.Model):
    class Trend(models.TextChoices):
        UP = 'UP', 'Improving'
        DOWN = 'DOWN', 'Declining'
        STABLE = 'STABLE', 'Stable'

    class ScoreLabel(models.TextChoices):
        CRITICAL = 'CRITICAL', 'Critical'
        POOR = 'POOR', 'Poor'
        FAIR = 'FAIR', 'Fair'
        GOOD = 'GOOD', 'Good'
        EXCELLENT = 'EXCELLENT', 'Excellent'

    business = models.ForeignKey(
        'accounts.Business', on_delete=models.CASCADE,
        null=True, blank=True, related_name='health_scores'
    )
    date = models.DateField()
    score = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    label = models.CharField(max_length=10, choices=ScoreLabel.choices, blank=True)
    trend = models.CharField(max_length=10, choices=Trend.choices, default=Trend.STABLE)
    previous_score = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True
    )

    # Input KPIs used to generate this score
    gross_profit_margin = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    expense_to_revenue_ratio = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    inventory_turnover_rate = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    customer_retention_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_expenses = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # SHAP explanations stored as JSON
    shap_values = models.JSONField(default=dict, blank=True)
    recommendations = models.JSONField(default=list, blank=True)

    model_version = models.CharField(max_length=20, default='v1.0')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('business', 'date')
        verbose_name = 'Business Health Score'
        verbose_name_plural = 'Business Health Scores'

    def save(self, *args, **kwargs):
        self.label = self._compute_label()
        super().save(*args, **kwargs)

    def _compute_label(self):
        score = float(self.score)
        if score >= 80:
            return self.ScoreLabel.EXCELLENT
        elif score >= 65:
            return self.ScoreLabel.GOOD
        elif score >= 50:
            return self.ScoreLabel.FAIR
        elif score >= 35:
            return self.ScoreLabel.POOR
        return self.ScoreLabel.CRITICAL

    def __str__(self):
        return f"{self.date} — Score: {self.score} ({self.label})"


class MLModelLog(models.Model):
    version = models.CharField(max_length=50)
    trained_at = models.DateTimeField(auto_now_add=True)
    mae = models.FloatField(null=True, blank=True)
    rmse = models.FloatField(null=True, blank=True)
    r2_score = models.FloatField(null=True, blank=True)
    training_samples = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ['-trained_at']
        verbose_name = 'ML Model Log'
        verbose_name_plural = 'ML Model Logs'

    def __str__(self):
        return f"Model {self.version} — R²: {self.r2_score} (active: {self.is_active})"
