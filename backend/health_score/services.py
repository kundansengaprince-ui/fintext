"""
Service layer: computes KPIs from DB records and triggers scoring.
"""
from datetime import date
from django.conf import settings
from django.db.models import Sum

from sales.models import SalesRecord
from expenses.models import ExpenseReport
from inventory.models import InventoryRecord
from customers.models import CustomerRetentionRecord
from .models import BusinessHealthScore

from ml.engine import load_model, load_all_models, predict_score, compare_all_models, compute_kpis


def _gather_kpis(target_date: date, business) -> dict:
    """Shared KPI extraction used by both compute functions."""
    sales = SalesRecord.objects.filter(date=target_date, business=business).first()
    expenses_qs = ExpenseReport.objects.filter(date=target_date, business=business)
    retention = CustomerRetentionRecord.objects.filter(date=target_date, business=business).first()
    inventory_qs = InventoryRecord.objects.filter(date=target_date, business=business)

    total_expenses = expenses_qs.aggregate(total=Sum('amount'))['total'] or 0
    inv_used_value = sum(float(r.quantity_used) * float(r.item.unit_cost) for r in inventory_qs)
    inv_avg_value = sum(
        ((float(r.opening_quantity) + (float(r.closing_quantity) or 0)) / 2) * float(r.item.unit_cost)
        for r in inventory_qs
    )
    return compute_kpis(
        sales={'total_sales': float(sales.total_sales) if sales else 0,
               'num_transactions': sales.num_transactions if sales else 0},
        expenses={'total_expenses': float(total_expenses), 'cost_of_goods': float(total_expenses) * 0.4},
        inventory_records={'quantity_used_value': inv_used_value,
                           'avg_inventory_value': inv_avg_value if inv_avg_value > 0 else 0},
        retention={'retention_rate': float(retention.retention_rate) if retention else 0},
    )


def compute_score_for_date(target_date: date, business) -> BusinessHealthScore:
    """Pull daily data, compute KPIs, run XGBoost model, save score."""
    kpis = _gather_kpis(target_date, business)

    model = load_model(str(settings.ML_MODEL_PATH))
    if model is None:
        raise RuntimeError('ML model not found. Run: python manage.py train_model')

    result = predict_score(model, kpis)

    previous = (
        BusinessHealthScore.objects.filter(business=business, date__lt=target_date)
        .order_by('-date')
        .values_list('score', flat=True)
        .first()
    )

    trend = 'STABLE'
    if previous is not None:
        diff = result['score'] - float(previous)
        if diff > 2:
            trend = 'UP'
        elif diff < -2:
            trend = 'DOWN'

    score_obj, _ = BusinessHealthScore.objects.update_or_create(
        business=business,
        date=target_date,
        defaults={
            'score': result['score'],
            'trend': trend,
            'previous_score': previous,
            'gross_profit_margin': kpis['gross_profit_margin'],
            'expense_to_revenue_ratio': kpis['expense_to_revenue_ratio'],
            'inventory_turnover_rate': kpis['inventory_turnover_rate'],
            'customer_retention_rate': kpis['customer_retention_rate'],
            'total_sales': kpis['total_sales'],
            'total_expenses': kpis['total_expenses'],
            'shap_values': result['shap_values'],
            'recommendations': result['recommendations'],
        }
    )
    return score_obj


def compare_models_for_date(target_date: date, business) -> dict:
    """Run all three models on the same date's KPIs and return comparison."""
    kpis = _gather_kpis(target_date, business)
    models = load_all_models(str(settings.ML_MODEL_PATH))
    missing = [n for n, m in models.items() if m is None]
    if missing:
        raise RuntimeError(f'Models not trained yet: {missing}. Run: python manage.py train_model')

    comparison = compare_all_models(models, kpis)
    return {
        'date': str(target_date),
        'kpis': kpis,
        'models': {
            'xgboost':           {'label': 'XGBoost',           **comparison['xgboost']},
            'random_forest':     {'label': 'Random Forest',     **comparison['random_forest']},
            'linear_regression': {'label': 'Linear Regression', **comparison['linear_regression']},
        },
    }
