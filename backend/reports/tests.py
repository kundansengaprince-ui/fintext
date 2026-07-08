from django.test import TestCase
from datetime import date, timedelta
from sales.models import SalesRecord
from expenses.models import ExpenseCategory, ExpenseReport
from health_score.models import BusinessHealthScore
from decimal import Decimal
from conftest_helpers import make_business, make_user, auth_client


class ReportsBusinessIsolationTest(TestCase):
    def setUp(self):
        self.biz     = make_business('My Biz')
        self.manager = make_user(self.biz, 'MANAGER', 'rep_mgr')
        self.cashier = make_user(self.biz, 'CASHIER', 'rep_cash')
        self.c       = auth_client(self.manager)
        self.cash_c  = auth_client(self.cashier)

        self.other_biz  = make_business('Other Biz')
        self.other_user = make_user(self.other_biz, 'MANAGER', 'other_rep_mgr')
        self.other_c    = auth_client(self.other_user)

        today = date.today()
        SalesRecord.objects.create(
            business=self.biz, date=today, total_sales=111111,
            num_transactions=10, created_by=self.manager,
        )
        SalesRecord.objects.create(
            business=self.other_biz, date=today, total_sales=999999,
            num_transactions=5, created_by=self.other_user,
        )

    def test_sales_report_returns_csv(self):
        r = self.c.get('/api/reports/sales/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('text/csv', r['Content-Type'])

    def test_sales_report_contains_own_data(self):
        r = self.c.get('/api/reports/sales/')
        self.assertIn('111111', r.content.decode())

    def test_sales_report_excludes_other_business(self):
        r = self.c.get('/api/reports/sales/')
        self.assertNotIn('999999', r.content.decode())

    def test_cashier_cannot_access_reports(self):
        r = self.cash_c.get('/api/reports/sales/')
        self.assertEqual(r.status_code, 403)

    def test_expenses_report_business_isolation(self):
        cat = ExpenseCategory.objects.create(name='Test Cat')
        ExpenseReport.objects.create(
            business=self.biz, date=date.today(), category=cat,
            amount=12345, created_by=self.manager,
        )
        ExpenseReport.objects.create(
            business=self.other_biz, date=date.today(), category=cat,
            amount=99999, created_by=self.other_user,
        )
        r = self.c.get('/api/reports/expenses/')
        content = r.content.decode()
        self.assertIn('12345', content)
        self.assertNotIn('99999', content)

    def test_full_report_uses_business_name(self):
        r = self.c.get('/api/reports/full/')
        self.assertIn('My Biz', r.content.decode())
        self.assertNotIn('Other Biz', r.content.decode())

    def test_report_meta_returns_list(self):
        r = self.c.get('/api/reports/')
        self.assertEqual(r.status_code, 200)
        keys = [item['key'] for item in r.json()]
        self.assertIn('sales', keys)
        self.assertIn('full', keys)

    def test_date_range_filter_in_sales_report(self):
        today = date.today()
        SalesRecord.objects.filter(business=self.biz).delete()
        SalesRecord.objects.create(
            business=self.biz, date=today - timedelta(days=10),
            total_sales=55555, num_transactions=5, created_by=self.manager,
        )
        SalesRecord.objects.create(
            business=self.biz, date=today,
            total_sales=77777, num_transactions=8, created_by=self.manager,
        )
        r = self.c.get('/api/reports/sales/', {'from': str(today), 'to': str(today)})
        content = r.content.decode()
        self.assertIn('77777', content)
        self.assertNotIn('55555', content)
