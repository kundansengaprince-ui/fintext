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
        # Inventory is no longer deducted at order creation - deduction happens on
        # POST /transactions/<id>/serve/ - so quantity_used stays at 0 after create.
        self.assertEqual(float(rec.quantity_used), 0.0)

    def test_inventory_record_auto_created_when_missing(self):
        # No inventory record for today - none should be created at order creation.
        # Deduction (and record auto-creation) now happens on the serve action.
        self.cash_c.post(TXN_URL, self._payload(), format='json')
        self.assertFalse(
            InventoryRecord.objects.filter(business=self.biz, item=self.inv_item, date=date.today()).exists()
        )

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


SERVE_URL = lambda pk: f'/api/pos/transactions/{pk}/serve/'


class MarkOrderServedTest(TestCase):
    """
    Tests for POST /api/pos/transactions/<pk>/serve/

    Covers:
      - Floor Staff can serve their own order → 200, stock deducted, served_at set
      - Floor Staff cannot serve another waiter's order → 403
      - Manager can serve any order → 200
      - Cashier can serve any order → 200
      - Serving twice is blocked (idempotency guard) → 400, no double-deduction
      - Voided order cannot be served → 400
      - Finance Officer cannot serve (wrong role) → 403
    """
    def setUp(self):
        self.biz      = make_business()
        self.manager  = make_user(self.biz, 'MANAGER',     'srv_mgr')
        self.cashier  = make_user(self.biz, 'CASHIER',     'srv_cash')
        self.waiter1  = make_user(self.biz, 'FLOOR_STAFF', 'srv_w1')
        self.waiter2  = make_user(self.biz, 'FLOOR_STAFF', 'srv_w2')
        self.finance  = make_user(self.biz, 'FINANCE_OFFICER', 'srv_fin')

        self.mgr_c    = auth_client(self.manager)
        self.cash_c   = auth_client(self.cashier)
        self.w1_c     = auth_client(self.waiter1)
        self.w2_c     = auth_client(self.waiter2)
        self.fin_c    = auth_client(self.finance)

        self.inv_item  = make_inv_item(self.biz, name='Primus', unit='btl', cost=500)
        self.menu_item = make_menu_item(
            self.biz, 'Primus', price=1500, category='beverage',
            inv_item=self.inv_item, qty_per_sale=1,
        )

    def _create_order(self, client, qty=2):
        """Create an order (status=open by default) and return its id."""
        r = client.post(TXN_URL, {
            'date': str(date.today()),
            'items': [{'menu_item': self.menu_item.id, 'quantity': qty}],
        }, format='json')
        self.assertEqual(r.status_code, 201, f'Order creation failed: {r.json()}')
        return r.json()['id']

    # --- Floor Staff serve their own order ---

    def test_floor_staff_can_serve_own_order(self):
        txn_id = self._create_order(self.w1_c)
        r = self.w1_c.post(SERVE_URL(txn_id))
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data['status'], 'completed')
        self.assertIsNotNone(data['served_at'])

    def test_serve_deducts_inventory(self):
        make_inv_record(self.biz, self.manager, self.inv_item, opening=100, used=0)
        txn_id = self._create_order(self.w1_c, qty=2)
        # No deduction yet
        rec = InventoryRecord.objects.get(business=self.biz, item=self.inv_item, date=date.today())
        self.assertEqual(float(rec.quantity_used), 0.0)
        # Serve the order
        self.w1_c.post(SERVE_URL(txn_id))
        rec.refresh_from_db()
        self.assertEqual(float(rec.quantity_used), 2.0)

    def test_serve_auto_creates_inventory_record_when_missing(self):
        txn_id = self._create_order(self.w1_c, qty=3)
        self.assertFalse(
            InventoryRecord.objects.filter(business=self.biz, item=self.inv_item, date=date.today()).exists()
        )
        self.w1_c.post(SERVE_URL(txn_id))
        rec = InventoryRecord.objects.get(business=self.biz, item=self.inv_item, date=date.today())
        self.assertEqual(float(rec.quantity_used), 3.0)

    def test_serve_updates_sales_record(self):
        txn_id = self._create_order(self.w1_c, qty=2)
        # After create: SalesRecord exists (get_or_created by _save_items) but with 0 totals
        # because the transaction is still open (status=open, not COMPLETED yet).
        sr = SalesRecord.objects.get(business=self.biz, date=date.today())
        self.assertEqual(float(sr.total_sales), 0.0)
        self.assertEqual(sr.num_transactions, 0)
        # After serve: status=completed, SalesRecord updated with real totals.
        self.w1_c.post(SERVE_URL(txn_id))
        sr.refresh_from_db()
        self.assertEqual(float(sr.total_sales), 3000.0)  # 2 × 1500
        self.assertEqual(sr.num_transactions, 1)

    # --- Floor Staff cannot serve another waiter's order ---

    def test_floor_staff_cannot_serve_other_waiters_order(self):
        txn_id = self._create_order(self.w1_c)  # waiter1 creates
        r = self.w2_c.post(SERVE_URL(txn_id))   # waiter2 tries to serve
        self.assertEqual(r.status_code, 403)

    def test_floor_staff_cannot_serve_managers_order(self):
        txn_id = self._create_order(self.mgr_c)
        r = self.w1_c.post(SERVE_URL(txn_id))
        self.assertEqual(r.status_code, 403)

    # --- Manager and Cashier can serve any order ---

    def test_manager_can_serve_any_order(self):
        txn_id = self._create_order(self.w1_c)
        r = self.mgr_c.post(SERVE_URL(txn_id))
        self.assertEqual(r.status_code, 200)

    def test_cashier_can_serve_any_order(self):
        txn_id = self._create_order(self.w1_c)
        r = self.cash_c.post(SERVE_URL(txn_id))
        self.assertEqual(r.status_code, 200)

    # --- Idempotency: no double-deduction ---

    def test_serve_twice_returns_400(self):
        txn_id = self._create_order(self.w1_c)
        self.w1_c.post(SERVE_URL(txn_id))
        r = self.w1_c.post(SERVE_URL(txn_id))
        self.assertEqual(r.status_code, 400)
        self.assertIn('already been marked', r.json()['detail'])

    def test_serve_twice_does_not_double_deduct_inventory(self):
        make_inv_record(self.biz, self.manager, self.inv_item, opening=100, used=0)
        txn_id = self._create_order(self.w1_c, qty=2)
        self.w1_c.post(SERVE_URL(txn_id))
        self.w1_c.post(SERVE_URL(txn_id))  # blocked by 400 - no effect
        rec = InventoryRecord.objects.get(business=self.biz, item=self.inv_item, date=date.today())
        self.assertEqual(float(rec.quantity_used), 2.0)  # still 2, not 4

    # --- Voided order cannot be served ---

    def test_voided_order_cannot_be_served(self):
        # Manager creates and immediately voids an order
        txn_id = self._create_order(self.mgr_c)
        self.mgr_c.patch(f'{TXN_URL}{txn_id}/', {'status': 'voided'}, format='json')
        r = self.mgr_c.post(SERVE_URL(txn_id))
        self.assertEqual(r.status_code, 400)
        self.assertIn('Voided', r.json()['detail'])

    # --- Finance Officer has no serve access ---

    def test_finance_officer_cannot_serve(self):
        txn_id = self._create_order(self.mgr_c)
        r = self.fin_c.post(SERVE_URL(txn_id))
        self.assertEqual(r.status_code, 403)

    # --- Floor Staff POST/PATCH lockout (carry-over from SalesPermission) ---

    def test_floor_staff_cannot_patch_transaction(self):
        txn_id = self._create_order(self.w1_c)
        r = self.w1_c.patch(f'{TXN_URL}{txn_id}/', {'notes': 'tampered'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_floor_staff_cannot_void_transaction(self):
        txn_id = self._create_order(self.w1_c)
        r = self.w1_c.patch(f'{TXN_URL}{txn_id}/', {'status': 'voided'}, format='json')
        self.assertEqual(r.status_code, 403)
