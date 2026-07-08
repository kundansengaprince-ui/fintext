from django.test import TestCase
from datetime import date, timedelta
from decimal import Decimal
from customers.models import CustomerRetentionRecord
from conftest_helpers import make_business, make_user, auth_client

URL = '/api/customers/'


def make_record(business, user, d=None, new=30, returning=70):
    return CustomerRetentionRecord.objects.create(
        business=business, date=d or date.today(),
        new_customers=new, returning_customers=returning,
        created_by=user,
    )


class CustomerModelTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'cust_mgr')

    def test_total_customers_auto_calculated(self):
        r = make_record(self.biz, self.user, new=30, returning=70)
        self.assertEqual(r.total_customers, 100)

    def test_retention_rate_auto_calculated(self):
        r = make_record(self.biz, self.user, new=25, returning=75)
        self.assertEqual(r.retention_rate, Decimal('75.00'))

    def test_zero_customers_retention_is_zero(self):
        r = make_record(self.biz, self.user, new=0, returning=0)
        self.assertEqual(r.retention_rate, Decimal('0.00'))

    def test_unique_per_business_per_date(self):
        make_record(self.biz, self.user)
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            make_record(self.biz, self.user)

    def test_str_contains_date(self):
        r = make_record(self.biz, self.user)
        self.assertIn(str(date.today()), str(r))


class CustomerAPITest(TestCase):
    def setUp(self):
        self.biz     = make_business()
        self.manager = make_user(self.biz, 'MANAGER',     'cmgr')
        self.floor   = make_user(self.biz, 'FLOOR_STAFF', 'cfloor')
        self.cashier = make_user(self.biz, 'CASHIER',     'ccash')
        self.finance = make_user(self.biz, 'FINANCE_OFFICER', 'cfin')
        self.mgr_c   = auth_client(self.manager)
        self.floor_c = auth_client(self.floor)
        self.cash_c  = auth_client(self.cashier)
        self.fin_c   = auth_client(self.finance)

    def _payload(self, d=None):
        return {'date': str(d or date.today()), 'new_customers': 20, 'returning_customers': 80}

    def test_manager_can_create(self):
        r = self.mgr_c.post(URL, self._payload(), format='json')
        self.assertEqual(r.status_code, 201)

    def test_floor_staff_can_create(self):
        r = self.floor_c.post(URL, self._payload(), format='json')
        self.assertEqual(r.status_code, 201)

    def test_cashier_cannot_create(self):
        r = self.cash_c.post(URL, self._payload(), format='json')
        self.assertEqual(r.status_code, 403)

    def test_finance_can_read(self):
        make_record(self.biz, self.manager)
        r = self.fin_c.get(URL)
        self.assertEqual(r.status_code, 200)

    def test_cashier_cannot_read(self):
        r = self.cash_c.get(URL)
        self.assertEqual(r.status_code, 403)

    def test_retention_rate_in_response(self):
        r = self.mgr_c.post(URL, {'date': str(date.today()), 'new_customers': 0, 'returning_customers': 100}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(float(r.json()['retention_rate']), 100.0)

    def test_date_range_filter(self):
        today = date.today()
        make_record(self.biz, self.manager, d=today - timedelta(days=5), new=10, returning=10)
        make_record(self.biz, self.manager, d=today, new=20, returning=20)
        r = self.mgr_c.get(URL, {'date_from': str(today)})
        results = r.json()['results'] if 'results' in r.json() else r.json()
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['new_customers'], 20)

    def test_business_isolation(self):
        other_biz  = make_business('Other')
        other_user = make_user(other_biz, 'MANAGER', 'other_cmgr')
        make_record(other_biz, other_user, new=999, returning=1)
        make_record(self.biz, self.manager, new=1, returning=1)
        r = self.mgr_c.get(URL)
        results = r.json()['results'] if 'results' in r.json() else r.json()
        new_counts = [rec['new_customers'] for rec in results]
        self.assertNotIn(999, new_counts)

    def test_manager_can_delete(self):
        rec = make_record(self.biz, self.manager)
        r = self.mgr_c.delete(f'{URL}{rec.id}/')
        self.assertEqual(r.status_code, 204)
