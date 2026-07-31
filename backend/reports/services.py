from datetime import date
from dateutil.relativedelta import relativedelta
from django.db.models import Sum

from expenses.models import ExpenseReport


def suggest_budget(business, category, target_month: date) -> float | None:
    """
    Returns a suggested budget amount for a given business + category + month.
    Uses the average actual spend over the last 3 completed months + 10% buffer.
    Falls back to fewer months if history is limited. Returns None if no history.
    Does NOT save anything - caller must confirm and POST to create ExpenseBudget.
    """
    # target_month should be first-of-month; look back from the month before it
    month_start = target_month.replace(day=1)
    lookback_end = month_start - relativedelta(days=1)       # last day of previous month
    lookback_start = month_start - relativedelta(months=3)   # 3 months back

    totals = (
        ExpenseReport.objects
        .filter(
            business=business,
            category=category,
            date__gte=lookback_start,
            date__lte=lookback_end,
        )
        .values('date__year', 'date__month')
        .annotate(monthly_total=Sum('amount'))
        .order_by('date__year', 'date__month')
    )

    monthly_amounts = [float(r['monthly_total']) for r in totals]
    if not monthly_amounts:
        return None

    avg = sum(monthly_amounts) / len(monthly_amounts)
    return round(avg * 1.10, 2)  # +10% buffer
