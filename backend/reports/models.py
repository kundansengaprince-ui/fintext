from django.db import models


class ExpenseBudget(models.Model):
    business = models.ForeignKey(
        'accounts.Business', on_delete=models.CASCADE,
        related_name='expense_budgets'
    )
    category = models.ForeignKey(
        'expenses.ExpenseCategory', on_delete=models.CASCADE,
        related_name='budgets'
    )
    # Always stored as first-of-month, e.g. 2026-07-01
    month = models.DateField()
    budgeted_amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_ai_suggested = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('business', 'category', 'month')
        ordering = ['month', 'category__name']
        verbose_name = 'Expense Budget'
        verbose_name_plural = 'Expense Budgets'

    def __str__(self):
        return f"{self.category.name} — {self.month.strftime('%b %Y')}: RWF {self.budgeted_amount:,.0f}"
