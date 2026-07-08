from django.test import TestCase
from datetime import date, timedelta
from decimal import Decimal
from inventory.models import InventoryItem, InventoryRecord
from conftest_helpers import make_business, make_user, auth_client

ITEMS_URL   = '/api/inventory/items/'
RECORDS_URL = '/api/inventory/records/'
LOW_URL     = '/api/inventory/low-stock/'


def make_item(business, name='Beer', unit='btl', reorder=10, unit_cost=500):
    return InventoryItem.objects.create(
        business=business, name=name, unit=unit,
        reorder_level=reorder, unit_cost=unit_cost,
    )


def make_record(business, user, item, d=None, opening=100, received=0, used=20, wastage=0):
    return InventoryRecord.objects.create(
        business=business, date=d or date.today(), item=item,
        opening_quantity=opening, quantity_received=received,
        quantity_used=used, wastage=wastage, created_by=user,
    )


class InventoryItemModelTest(TestCase):
    def setUp(self):
        self.biz = make_business()

    def test_str(self):
        item = make_item(self.biz, 'Primus')
        self.assertIn('Primus', str(item))

    def test_default_is_active(self):
        item = make_item(self.biz)
        self.assertTrue(item.is_active)


class InventoryRecordModelTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'inv_mgr')
        self.item = make_item(self.biz)

    def test_closing_quantity_auto_calculated(self):
        r = make_record(self.biz, self.user, self.item,
                        opening=100, received=20, used=30, wastage=5)
        self.assertEqual(r.closing_quantity, Decimal('85'))

    def test_str_contains_item_name(self):
        r = make_record(self.biz, self.user, self.item)
        self.assertIn('Beer', str(r))

    def test_unique_per_business_date_item(self):
        make_record(self.biz, self.user, self.item)
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            make_record(self.biz, self.user, self.item)


class InventoryAPIPermissionsTest(TestCase):
    def setUp(self):
        self.biz     = make_business()
        self.manager = make_user(self.biz, 'MANAGER',         'imgt')
        self.finance = make_user(self.biz, 'FINANCE_OFFICER', 'ifin')
        self.cashier = make_user(self.biz, 'CASHIER',         'icash')
        self.mgr_c   = auth_client(self.manager)
        self.fin_c   = auth_client(self.finance)
        self.cash_c  = auth_client(self.cashier)
        self.item    = make_item(self.biz)

    def _record_payload(self, d=None):
        return {'date': str(d or date.today()), 'item': self.item.id,
                'opening_quantity': '50', 'quantity_received': '10',
                'quantity_used': '15', 'wastage': '2'}

    def test_manager_can_create_record(self):
        r = self.mgr_c.post(RECORDS_URL, self._record_payload(), format='json')
        self.assertEqual(r.status_code, 201)

    def test_finance_cannot_create_record(self):
        r = self.fin_c.post(RECORDS_URL, self._record_payload(), format='json')
        self.assertEqual(r.status_code, 403)

    def test_finance_can_read_records(self):
        make_record(self.biz, self.manager, self.item)
        r = self.fin_c.get(RECORDS_URL)
        self.assertEqual(r.status_code, 200)

    def test_cashier_cannot_read_records(self):
        r = self.cash_c.get(RECORDS_URL)
        self.assertEqual(r.status_code, 403)

    def test_closing_quantity_in_response(self):
        r = self.mgr_c.post(RECORDS_URL, self._record_payload(), format='json')
        self.assertEqual(r.status_code, 201)
        # opening=50 + received=10 - used=15 - wastage=2 = 43
        self.assertEqual(float(r.json()['closing_quantity']), 43.0)


class InventoryFilterTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'ifilt')
        self.c    = auth_client(self.user)
        self.item = make_item(self.biz)
        self.item2 = make_item(self.biz, 'Wine', 'btl')

    def test_item_filter(self):
        today = date.today()
        make_record(self.biz, self.user, self.item,  d=today,                    opening=100, used=10)
        make_record(self.biz, self.user, self.item2, d=today - timedelta(days=1), opening=50,  used=5)
        r = self.c.get(RECORDS_URL, {'item': self.item.id})
        results = r.json()['results'] if 'results' in r.json() else r.json()
        items = [rec['item'] for rec in results]
        self.assertTrue(all(i == self.item.id for i in items))

    def test_date_range_filter(self):
        today = date.today()
        make_record(self.biz, self.user, self.item,  d=today,                     opening=100, used=10)
        make_record(self.biz, self.user, self.item2, d=today - timedelta(days=10), opening=50,  used=5)
        r = self.c.get(RECORDS_URL, {'date_from': str(today)})
        results = r.json()['results'] if 'results' in r.json() else r.json()
        self.assertEqual(len(results), 1)


class LowStockAlertTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'ilow')
        self.c    = auth_client(self.user)

    def test_low_stock_item_appears(self):
        item = make_item(self.biz, 'Milk', 'L', reorder=20)
        # closing = 100 + 0 - 90 - 0 = 10, reorder=20 → low stock
        make_record(self.biz, self.user, item, opening=100, used=90)
        r = self.c.get(LOW_URL)
        self.assertEqual(r.status_code, 200)
        names = [i['name'] for i in r.json()]
        self.assertIn('Milk', names)

    def test_healthy_stock_not_in_alert(self):
        item = make_item(self.biz, 'Rice', 'kg', reorder=5)
        make_record(self.biz, self.user, item, opening=100, used=10)
        r = self.c.get(LOW_URL)
        names = [i['name'] for i in r.json()]
        self.assertNotIn('Rice', names)

    def test_business_isolation(self):
        other_biz  = make_business('Other')
        other_user = make_user(other_biz, 'MANAGER', 'other_ilow')
        other_item = make_item(other_biz, 'OtherBeer', reorder=50)
        make_record(other_biz, other_user, other_item, opening=100, used=90)
        r = self.c.get(LOW_URL)
        names = [i['name'] for i in r.json()]
        self.assertNotIn('OtherBeer', names)
