from django.test import TestCase
from datetime import date
from decimal import Decimal
from pos.models import MenuItem, Transaction, TransactionItem
from inventory.models import InventoryItem, InventoryRecord
from sales.models import SalesRecord
from conftest_helpers import make_business, make_user, auth_client

MENU_URL = '/api/pos/menu/'
TXN_URL  = '/api/pos/transactions/'


def make_inv_item(business, name='Beer', unit='btl', reorder=5, cost=500):
    return InventoryItem.objects.create(
        business=business, name=name, unit=unit,
        reorder_level=reorder, unit_cost=cost,
    )


def make_menu_item(business, name='Primus', price=1500, category='beverage', inv_item=None, qty_per_sale=1):
    return MenuItem.objects.create(
        business=business, name=name, price=price, category=category,
        inventory_item=inv_item, inventory_qty_per_sale=qty_per_sale,
    )


def make_inv_record(business, user, item, d=None, opening=100, used=0):
    return InventoryRecord.objects.create(
        business=business, date=d or date.today(), item=item,
        opening_quantity=opening, quantity_received=0,
        quantity_used=used, wastage=0, created_by=user,
    )


class MenuItemModelTest(TestCase):
    def setUp(self):
        self.biz = make_business()

    def test_str(self):
        m = make_menu_item(self.biz)
        self.assertIn('Primus', str(m))
        self.assertIn('1500', str(m))

    def test_default_is_available(self):
        m = make_menu_item(self.biz)
        self.assertTrue(m.is_available)


class MenuAPITest(TestCase):
    def setUp(self):
        self.biz     = make_business()
        self.manager = make_user(self.biz, 'MANAGER', 'pos_mgr')
        self.cashier = make_user(self.biz, 'CASHIER', 'pos_cash')
        self.mgr_c   = auth_client(self.manager)
        self.cash_c  = auth_client(self.cashier)

    def test_manager_can_create_menu_item(self):
        r = self.mgr_c.post(MENU_URL, {
            'name': 'Fanta', 'category': 'beverage', 'price': '800',
        }, format='json')
        self.assertEqual(r.status_code, 201)

    def test_cashier_can_read_menu(self):
        make_menu_item(self.biz)
        r = self.cash_c.get(MENU_URL)
        self.assertEqual(r.status_code, 200)

    def test_available_only_filter(self):
        make_menu_item(self.biz, 'Available')
        m2 = make_menu_item(self.biz, 'Unavailable')
        m2.is_available = False
        m2.save()
        r = self.cash_c.get(MENU_URL, {'available_only': True})
        names = [i['name'] for i in r.json()]
        self.assertIn('Available', names)
        self.assertNotIn('Unavailable', names)

    def test_business_isolation(self):
        other_biz  = make_business('Other')
        other_user = make_user(other_biz, 'MANAGER', 'other_pos_mgr')
        make_menu_item(other_biz, 'OtherItem')
        make_menu_item(self.biz, 'MyItem')
        r = self.mgr_c.get(MENU_URL)
        names = [i['name'] for i in r.json()]
        self.assertIn('MyItem', names)
        self.assertNotIn('OtherItem', names)

    def test_toggle_availability(self):
        m = make_menu_item(self.biz, 'Toggled')
        r = self.mgr_c.patch(f'{MENU_URL}{m.id}/', {'is_available': False}, format='json')
        self.assertEqual(r.status_code, 200)
        m.refresh_from_db()
        self.assertFalse(m.is_available)


class TransactionCreateTest(TestCase):
    def setUp(self):
        self.biz     = make_business()
        self.manager = make_user(self.biz, 'MANAGER', 'txn_mgr')
        self.cashier = make_user(self.biz, 'CASHIER', 'txn_cash')
        self.mgr_c   = auth_client(self.manager)
        self.cash_c  = auth_client(self.cashier)
        self.inv_item = make_inv_item(self.biz)
        self.menu_item = make_menu_item(
            self.biz, 'Primus', price=1500, category='beverage',
            inv_item=self.inv_item, qty_per_sale=1,
        )
        self.food_item = make_menu_item(self.biz, 'Brochette', price=3000, category='food')

    def _payload(self, items=None):
        return {
            'date': str(date.today()),
            'status': 'completed',
            'items': items or [{'menu_item': self.menu_item.id, 'quantity': 2}],
        }

    def test_cashier_can_create_transaction(self):
        r = self.cash_c.post(TXN_URL, self._payload(), format='json')
        self.assertEqual(r.status_code, 201)

    def test_total_calculated_correctly(self):
        r = self.cash_c.post(TXN_URL, self._payload(), format='json')
        # 2 × 1500 = 3000
        self.assertEqual(float(r.json()['total']), 3000.0)

    def test_sales_record_auto_created(self):
        self.cash_c.post(TXN_URL, self._payload(), format='json')
        self.assertTrue(SalesRecord.objects.filter(business=self.biz, date=date.today()).exists())

    def test_sales_record_total_matches_transaction(self):
        self.cash_c.post(TXN_URL, self._payload(), format='json')
        sr = SalesRecord.objects.get(business=self.biz, date=date.today())
        self.assertEqual(float(sr.total_sales), 3000.0)

    def test_beverage_sales_categorised(self):
        self.cash_c.post(TXN_URL, self._payload(), format='json')
        sr = SalesRecord.objects.get(business=self.biz, date=date.today())
        self.assertEqual(float(sr.beverage_sales), 3000.0)
        self.assertEqual(float(sr.food_sales), 0.0)

    def test_food_and_beverage_split(self):
        payload = self._payload(items=[
            {'menu_item': self.menu_item.id, 'quantity': 2},   # 2×1500 = 3000 bev
            {'menu_item': self.food_item.id, 'quantity': 1},   # 1×3000 = 3000 food
        ])
        self.cash_c.post(TXN_URL, payload, format='json')
        sr = SalesRecord.objects.get(business=self.biz, date=date.today())
        self.assertEqual(float(sr.total_sales), 6000.0)
        self.assertEqual(float(sr.beverage_sales), 3000.0)
        self.assertEqual(float(sr.food_sales), 3000.0)

    def test_inventory_decremented_when_record_exists(self):
        make_inv_record(self.biz, self.manager, self.inv_item, opening=100, used=0)
        self.cash_c.post(TXN_URL, self._payload(), format='json')
        rec = InventoryRecord.objects.get(business=self.biz, item=self.inv_item, date=date.today())
        # 2 beers sold × 1 unit each = quantity_used should be 2
        self.assertEqual(float(rec.quantity_used), 2.0)

    def test_inventory_record_auto_created_when_missing(self):
        # No inventory record for today — should be created automatically
        self.cash_c.post(TXN_URL, self._payload(), format='json')
        self.assertTrue(
            InventoryRecord.objects.filter(business=self.biz, item=self.inv_item, date=date.today()).exists()
        )
        rec = InventoryRecord.objects.get(business=self.biz, item=self.inv_item, date=date.today())
        self.assertEqual(float(rec.quantity_used), 2.0)

    def test_multiple_transactions_accumulate_in_sales_record(self):
        self.cash_c.post(TXN_URL, self._payload(), format='json')
        self.cash_c.post(TXN_URL, self._payload(), format='json')
        sr = SalesRecord.objects.get(business=self.biz, date=date.today())
        self.assertEqual(float(sr.total_sales), 6000.0)
        self.assertEqual(sr.num_transactions, 2)

    def test_transaction_count_in_sales_record(self):
        for _ in range(3):
            self.cash_c.post(TXN_URL, self._payload(), format='json')
        sr = SalesRecord.objects.get(business=self.biz, date=date.today())
        self.assertEqual(sr.num_transactions, 3)


class TransactionVoidTest(TestCase):
    def setUp(self):
        self.biz     = make_business()
        self.manager = make_user(self.biz, 'MANAGER', 'void_mgr')
        self.cashier = make_user(self.biz, 'CASHIER', 'void_cash')
        self.mgr_c   = auth_client(self.manager)
        self.cash_c  = auth_client(self.cashier)
        self.menu_item = make_menu_item(self.biz, 'Primus', price=1500)

    def _create_txn(self):
        r = self.cash_c.post(TXN_URL, {
            'date': str(date.today()), 'status': 'completed',
            'items': [{'menu_item': self.menu_item.id, 'quantity': 2}],
        }, format='json')
        return r.json()['id']

    def test_void_removes_from_sales_total(self):
        txn_id = self._create_txn()
        txn_id2 = self._create_txn()
        # Void first transaction
        self.mgr_c.patch(f'{TXN_URL}{txn_id}/', {'status': 'voided'}, format='json')
        sr = SalesRecord.objects.get(business=self.biz, date=date.today())
        # Only 1 transaction of 3000 should remain
        self.assertEqual(float(sr.total_sales), 3000.0)
        self.assertEqual(sr.num_transactions, 1)

    def test_list_transactions(self):
        self._create_txn()
        r = self.mgr_c.get(TXN_URL)
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(len(r.json()), 1)

    def test_business_isolation_transactions(self):
        other_biz  = make_business('Other')
        other_user = make_user(other_biz, 'MANAGER', 'other_void_mgr')
        other_menu = make_menu_item(other_biz, 'OtherDrink', price=9999)
        auth_client(other_user).post(TXN_URL, {
            'date': str(date.today()), 'status': 'completed',
            'items': [{'menu_item': other_menu.id, 'quantity': 1}],
        }, format='json')
        r = self.mgr_c.get(TXN_URL)
        totals = [float(t['total']) for t in r.json()]
        self.assertNotIn(9999.0, totals)
