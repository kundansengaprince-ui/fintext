from django.test import TestCase
from datetime import date, timedelta
from sales.models import SalesRecord
from conftest_helpers import make_business, make_user, auth_client

URL = '/api/sales/'


def make_sale(business, user, d=None, total=500000, txns=50):
    return SalesRecord.objects.create(
        business=business, date=d or date.today(),
        total_sales=total, num_transactions=txns,
        food_sales=300000, beverage_sales=200000,
        created_by=user,
    )


class SalesModelTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'sales_mgr')

    def test_avg_transaction_value_auto_calculated(self):
        s = make_sale(self.biz, self.user, total=500000, txns=50)
        self.assertEqual(float(s.avg_transaction_value), 10000.0)

    def test_str_contains_date_and_total(self):
        s = make_sale(self.biz, self.user)
        self.assertIn(str(date.today()), str(s))
        self.assertIn('500', str(s))

    def test_unique_per_business_per_date(self):
        make_sale(self.biz, self.user)
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            make_sale(self.biz, self.user)


class SalesAPITest(TestCase):
    def setUp(self):
        self.biz     = make_business()
        self.manager = make_user(self.biz, 'MANAGER',  'smgr')
        self.cashier = make_user(self.biz, 'CASHIER',  'scash')
        self.finance = make_user(self.biz, 'FINANCE_OFFICER', 'sfin')
        self.floor   = make_user(self.biz, 'FLOOR_STAFF', 'sfloor')
        self.mgr_c   = auth_client(self.manager)
        self.cash_c  = auth_client(self.cashier)
        self.fin_c   = auth_client(self.finance)
        self.floor_c = auth_client(self.floor)

    def _payload(self, d=None):
        return {'date': str(d or date.today()), 'total_sales': '800000',
                'food_sales': '500000', 'beverage_sales': '300000', 'num_transactions': 80}

    def test_manager_can_create(self):
        r = self.mgr_c.post(URL, self._payload(), format='json')
        self.assertEqual(r.status_code, 201)

    def test_cashier_can_create(self):
        r = self.cash_c.post(URL, self._payload(), format='json')
        self.assertEqual(r.status_code, 201)

    def test_finance_cannot_create(self):
        r = self.fin_c.post(URL, self._payload(), format='json')
        self.assertEqual(r.status_code, 403)

    def test_floor_staff_cannot_read(self):
        r = self.floor_c.get(URL)
        self.assertEqual(r.status_code, 403)

    def test_finance_can_read(self):
        make_sale(self.biz, self.manager)
        r = self.fin_c.get(URL)
        self.assertEqual(r.status_code, 200)

    def test_list_returns_only_own_business(self):
        other_biz  = make_business('Other')
        other_user = make_user(other_biz, 'MANAGER', 'other_smgr')
        make_sale(other_biz, other_user, total=999999)
        make_sale(self.biz, self.manager, total=111111)
        r = self.mgr_c.get(URL)
        totals = [float(s['total_sales']) for s in r.json()['results']]
        self.assertIn(111111.0, totals)
        self.assertNotIn(999999.0, totals)

    def test_date_from_filter(self):
        today = date.today()
        make_sale(self.biz, self.manager, d=today - timedelta(days=5), total=100)
        make_sale(self.biz, self.manager, d=today, total=200)
        r = self.mgr_c.get(URL, {'date_from': str(today)})
        totals = [float(s['total_sales']) for s in r.json()['results']]
        self.assertIn(200.0, totals)
        self.assertNotIn(100.0, totals)

    def test_date_to_filter(self):
        today = date.today()
        make_sale(self.biz, self.manager, d=today - timedelta(days=5), total=100)
        make_sale(self.biz, self.manager, d=today, total=200)
        r = self.mgr_c.get(URL, {'date_to': str(today - timedelta(days=1))})
        totals = [float(s['total_sales']) for s in r.json()['results']]
        self.assertIn(100.0, totals)
        self.assertNotIn(200.0, totals)

    def test_manager_can_update(self):
        s = make_sale(self.biz, self.manager)
        r = self.mgr_c.patch(f'{URL}{s.id}/', {'total_sales': '999999'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(float(r.json()['total_sales']), 999999.0)

    def test_manager_can_delete(self):
        s = make_sale(self.biz, self.manager)
        r = self.mgr_c.delete(f'{URL}{s.id}/')
        self.assertEqual(r.status_code, 204)
        self.assertFalse(SalesRecord.objects.filter(id=s.id).exists())

    def test_unauthenticated_rejected(self):
        from rest_framework.test import APIClient
        r = APIClient().get(URL)
        self.assertEqual(r.status_code, 401)
