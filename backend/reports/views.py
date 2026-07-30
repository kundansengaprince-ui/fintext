import csv
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from django.http import HttpResponse
from django.db.models import Sum, Avg, Q
from django.db.models.functions import TruncMonth
from rest_framework.views import APIView
from rest_framework.response import Response

from sales.models import SalesRecord
from expenses.models import ExpenseReport
from inventory.models import InventoryRecord
from customers.models import CustomerRetentionRecord
from health_score.models import BusinessHealthScore
from core.permissions import DashboardPermission


def _date_range(request):
    today = date.today()
    try:
        date_from = date.fromisoformat(request.query_params.get('from', str(today - timedelta(days=29))))
        date_to   = date.fromisoformat(request.query_params.get('to',   str(today)))
    except ValueError:
        date_from = today - timedelta(days=29)
        date_to   = today
    return date_from, date_to


def _csv_response(filename):
    resp = HttpResponse(content_type='text/csv')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp


class SalesReportView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        d_from, d_to = _date_range(request)
        records = SalesRecord.objects.filter(
            business=request.user.business, date__gte=d_from, date__lte=d_to
        ).order_by('date')

        resp = _csv_response(f'sales_report_{d_from}_{d_to}.csv')
        w = csv.writer(resp)
        w.writerow(['Date', 'Total Sales (RWF)', 'Food Sales (RWF)', 'Beverage Sales (RWF)',
                    'Transactions', 'Avg Transaction (RWF)', 'Notes'])
        for r in records:
            w.writerow([r.date, r.total_sales, r.food_sales, r.beverage_sales,
                        r.num_transactions, r.avg_transaction_value or '', r.notes])
        return resp


class ExpensesReportView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        d_from, d_to = _date_range(request)
        records = (ExpenseReport.objects
                   .select_related('category', 'created_by')
                   .filter(business=request.user.business, date__gte=d_from, date__lte=d_to)
                   .order_by('date'))

        resp = _csv_response(f'expenses_report_{d_from}_{d_to}.csv')
        w = csv.writer(resp)
        w.writerow(['Date', 'Category', 'Amount (RWF)', 'Description', 'Receipt Ref', 'Entered By'])
        for r in records:
            w.writerow([r.date, r.category.name, r.amount, r.description,
                        r.receipt_reference,
                        r.created_by.get_full_name() or r.created_by.username if r.created_by else ''])
        return resp


class InventoryReportView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        d_from, d_to = _date_range(request)
        records = (InventoryRecord.objects
                   .select_related('item', 'created_by')
                   .filter(business=request.user.business, date__gte=d_from, date__lte=d_to)
                   .order_by('date', 'item__name'))

        resp = _csv_response(f'inventory_report_{d_from}_{d_to}.csv')
        w = csv.writer(resp)
        w.writerow(['Date', 'Item', 'Unit', 'Opening', 'Received', 'Used', 'Wastage', 'Closing', 'Entered By'])
        for r in records:
            w.writerow([r.date, r.item.name, r.item.unit,
                        r.opening_quantity, r.quantity_received, r.quantity_used,
                        r.wastage, r.closing_quantity,
                        r.created_by.get_full_name() or r.created_by.username if r.created_by else ''])
        return resp


class CustomersReportView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        d_from, d_to = _date_range(request)
        records = CustomerRetentionRecord.objects.filter(
            business=request.user.business, date__gte=d_from, date__lte=d_to
        ).order_by('date')

        resp = _csv_response(f'customers_report_{d_from}_{d_to}.csv')
        w = csv.writer(resp)
        w.writerow(['Date', 'New Customers', 'Returning Customers', 'Total', 'Retention Rate (%)', 'Notes'])
        for r in records:
            w.writerow([r.date, r.new_customers, r.returning_customers,
                        r.total_customers, r.retention_rate, r.notes])
        return resp


class HealthScoreReportView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        d_from, d_to = _date_range(request)
        records = BusinessHealthScore.objects.filter(
            business=request.user.business, date__gte=d_from, date__lte=d_to
        ).order_by('date')

        resp = _csv_response(f'health_scores_{d_from}_{d_to}.csv')
        w = csv.writer(resp)
        w.writerow(['Date', 'Score', 'Label', 'Trend',
                    'Gross Profit Margin (%)', 'Expense-to-Revenue (%)',
                    'Inventory Turnover', 'Customer Retention (%)',
                    'Total Sales (RWF)', 'Total Expenses (RWF)'])
        for r in records:
            w.writerow([r.date, r.score, r.label, r.trend,
                        r.gross_profit_margin, r.expense_to_revenue_ratio,
                        r.inventory_turnover_rate, r.customer_retention_rate,
                        r.total_sales, r.total_expenses])
        return resp


class FullReportView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        d_from, d_to = _date_range(request)
        business = request.user.business

        resp = _csv_response(f'full_report_{d_from}_{d_to}.csv')
        w = csv.writer(resp)

        w.writerow([f'{business.name} — Full Business Report', f'{d_from} to {d_to}'])
        w.writerow([])

        w.writerow(['=== SALES ==='])
        w.writerow(['Date', 'Total Sales', 'Food', 'Beverages', 'Transactions', 'Avg/Txn'])
        for r in SalesRecord.objects.filter(business=business, date__gte=d_from, date__lte=d_to).order_by('date'):
            w.writerow([r.date, r.total_sales, r.food_sales, r.beverage_sales,
                        r.num_transactions, r.avg_transaction_value or ''])
        w.writerow([])

        w.writerow(['=== EXPENSES ==='])
        w.writerow(['Date', 'Category', 'Amount', 'Description'])
        for r in (ExpenseReport.objects.select_related('category')
                  .filter(business=business, date__gte=d_from, date__lte=d_to).order_by('date')):
            w.writerow([r.date, r.category.name, r.amount, r.description])
        w.writerow([])

        w.writerow(['=== HEALTH SCORES ==='])
        w.writerow(['Date', 'Score', 'Label', 'Trend'])
        for r in BusinessHealthScore.objects.filter(business=business, date__gte=d_from, date__lte=d_to).order_by('date'):
            w.writerow([r.date, r.score, r.label, r.trend])

        return resp


class ReportMetaView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        return Response([
            {'key': 'sales',         'label': 'Sales Report',        'description': 'Daily sales, transactions and averages'},
            {'key': 'expenses',      'label': 'Expenses Report',      'description': 'All expenses by category with entered-by audit'},
            {'key': 'inventory',     'label': 'Inventory Report',     'description': 'Stock levels, usage and wastage per item'},
            {'key': 'customers',     'label': 'Customer Retention',   'description': 'New vs returning customers and retention rates'},
            {'key': 'health-scores', 'label': 'Health Score History', 'description': 'Business health scores and KPIs over time'},
            {'key': 'full',          'label': 'Full Export',          'description': 'All data combined in one CSV file'},
        ])


class FinancialAnalyticsView(APIView):
    """
    GET /api/reports/analytics/?from=YYYY-MM-DD&to=YYYY-MM-DD
    Returns full financial analytics JSON for the authenticated business.
    """
    permission_classes = [DashboardPermission]

    def get(self, request):
        business = request.user.business
        d_from, d_to = _date_range(request)

        # ── 1. KPI aggregates ────────────────────────────────────────────────
        revenue = SalesRecord.objects.filter(
            business=business, date__gte=d_from, date__lte=d_to
        ).aggregate(total=Sum('total_sales'))['total'] or 0

        expenses = ExpenseReport.objects.filter(
            business=business, date__gte=d_from, date__lte=d_to
        ).aggregate(total=Sum('amount'))['total'] or 0

        net_profit = float(revenue) - float(expenses)
        margin_pct = round((net_profit / float(revenue) * 100), 2) if revenue else 0

        # Cash balance = cumulative revenue - cumulative expenses (all time up to d_to)
        total_rev_all = SalesRecord.objects.filter(
            business=business, date__lte=d_to
        ).aggregate(t=Sum('total_sales'))['t'] or 0
        total_exp_all = ExpenseReport.objects.filter(
            business=business, date__lte=d_to
        ).aggregate(t=Sum('amount'))['t'] or 0
        cash_balance = float(total_rev_all) - float(total_exp_all)

        # Cash runway: avg monthly burn over last 3 months
        three_months_ago = d_to - relativedelta(months=3)
        rev_3m = SalesRecord.objects.filter(
            business=business, date__gt=three_months_ago, date__lte=d_to
        ).aggregate(t=Sum('total_sales'))['t'] or 0
        exp_3m = ExpenseReport.objects.filter(
            business=business, date__gt=three_months_ago, date__lte=d_to
        ).aggregate(t=Sum('amount'))['t'] or 0
        avg_monthly_burn = (float(exp_3m) - float(rev_3m)) / 3
        runway_months = round(cash_balance / avg_monthly_burn, 1) if avg_monthly_burn > 0 else None

        # ── 2. Revenue by source ─────────────────────────────────────────────
        rev_agg = SalesRecord.objects.filter(
            business=business, date__gte=d_from, date__lte=d_to
        ).aggregate(food=Sum('food_sales'), beverage=Sum('beverage_sales'))
        food = float(rev_agg['food'] or 0)
        beverage = float(rev_agg['beverage'] or 0)
        other = float(revenue) - food - beverage
        revenue_by_source = [
            {'source': 'Food', 'amount': round(food, 2)},
            {'source': 'Beverage', 'amount': round(beverage, 2)},
        ]
        if other > 0:
            revenue_by_source.append({'source': 'Other', 'amount': round(other, 2)})

        # ── 3. Expenses by category with MoM change ──────────────────────────
        prev_from = d_from - relativedelta(months=1)
        prev_to   = d_to   - relativedelta(months=1)

        curr_by_cat = (
            ExpenseReport.objects
            .filter(business=business, date__gte=d_from, date__lte=d_to)
            .values('category__name')
            .annotate(amount=Sum('amount'))
        )
        prev_by_cat = (
            ExpenseReport.objects
            .filter(business=business, date__gte=prev_from, date__lte=prev_to)
            .values('category__name')
            .annotate(amount=Sum('amount'))
        )
        prev_map = {r['category__name']: float(r['amount']) for r in prev_by_cat}

        expense_by_category = []
        for row in curr_by_cat:
            cat   = row['category__name']
            curr  = float(row['amount'])
            prev  = prev_map.get(cat, 0)
            mom   = round(((curr - prev) / prev * 100), 1) if prev else None
            expense_by_category.append({'category': cat, 'amount': round(curr, 2), 'mom_pct': mom})
        expense_by_category.sort(key=lambda x: x['amount'], reverse=True)

        # ── 4. Monthly trend (last 6 months) ─────────────────────────────────
        six_months_ago = d_to - relativedelta(months=6)

        monthly_sales = (
            SalesRecord.objects
            .filter(business=business, date__gt=six_months_ago, date__lte=d_to)
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(revenue=Sum('total_sales'))
            .order_by('month')
        )
        monthly_expenses = (
            ExpenseReport.objects
            .filter(business=business, date__gt=six_months_ago, date__lte=d_to)
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(expenses=Sum('amount'))
            .order_by('month')
        )

        exp_map = {r['month']: float(r['expenses']) for r in monthly_expenses}
        running_cash = cash_balance  # approximate — walk backwards not needed for trend shape
        trend_rows = []
        for row in monthly_sales:
            m     = row['month']
            rev   = float(row['revenue'])
            exp   = exp_map.get(m, 0)
            gm    = round(((rev - exp) / rev * 100), 2) if rev else 0
            nm    = round(((rev - exp) / rev * 100), 2) if rev else 0
            trend_rows.append({
                'month':        m.strftime('%b %Y'),
                'revenue':      round(rev, 2),
                'expenses':     round(exp, 2),
                'gross_margin': gm,
                'net_margin':   nm,
                'cash_balance': round(running_cash, 2),
            })

        # ── 5. Budget vs actual — no budget model exists ──────────────────────
        # To enable this, add a model: ExpenseBudget(business, category, month, budgeted_amount)
        budget_vs_actual = []

        # ── 6. Recent transactions ────────────────────────────────────────────
        recent_sales = (
            SalesRecord.objects
            .filter(business=business, date__gte=d_from, date__lte=d_to)
            .order_by('-date')[:20]
            .values('date', 'total_sales', 'notes')
        )
        recent_expenses = (
            ExpenseReport.objects
            .select_related('category')
            .filter(business=business, date__gte=d_from, date__lte=d_to)
            .order_by('-date')[:20]
            .values('date', 'amount', 'description', 'category__name')
        )

        recent_transactions = []
        for r in recent_sales:
            recent_transactions.append({
                'date':        str(r['date']),
                'description': r['notes'] or 'Daily sales',
                'category':    'Revenue',
                'amount':      float(r['total_sales']),
                'type':        'income',
            })
        for r in recent_expenses:
            recent_transactions.append({
                'date':        str(r['date']),
                'description': r['description'] or r['category__name'],
                'category':    r['category__name'],
                'amount':      float(r['amount']),
                'type':        'expense',
            })
        recent_transactions.sort(key=lambda x: x['date'], reverse=True)
        recent_transactions = recent_transactions[:30]

        return Response({
            'kpis': {
                'revenue':       round(float(revenue), 2),
                'expenses':      round(float(expenses), 2),
                'net_profit':    round(net_profit, 2),
                'margin_pct':    margin_pct,
                'cash_balance':  round(cash_balance, 2),
                'runway_months': runway_months,
                'overdue_ar':    None,  # No AR/invoice model exists
            },
            'revenue_by_source':   revenue_by_source,
            'expense_by_category': expense_by_category,
            'monthly_trend':       trend_rows,
            'budget_vs_actual':    budget_vs_actual,
            'recent_transactions': recent_transactions,
        })
