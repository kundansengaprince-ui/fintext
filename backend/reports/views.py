import csv
from datetime import date, timedelta
from django.http import HttpResponse
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
