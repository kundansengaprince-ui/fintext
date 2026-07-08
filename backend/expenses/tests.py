from django.test import TestCase
from datetime import date, timedelta
from expenses.models import ExpenseCategory, ExpenseReport
from conftest_helpers import make_business, make_user, auth_client

URL      = '/api/expenses/'
CAT_URL  = '/api/expenses/categories/'


def make_category(name='Food Supplies'):
    return ExpenseCategory.objects.create(name=name)


def make_expense(business, user, category, d=None, amount=50000):
    return ExpenseReport.objects.create(
        business=business, date=d or date.today(),
        category=category, amount=amount,
        description='Test expense', created_by=user,
    )


class ExpenseCategoryModelTest(TestCase):
    def test_str(self):
        c = make_category('Utilities')
        self.assertEqual(str(c), 'Utilities')


class ExpenseModelTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'exp_mgr')
        self.cat  = make_category()

    def test_str_contains_category_and_amount(self):
        e = make_expense(self.biz, self.user, self.cat, amount=75000)
        self.assertIn('75', str(e))


class ExpenseAPITest(TestCase):
    def setUp(self):
        self.biz     = make_business()
        self.manager = make_user(self.biz, 'MANAGER',         'emgr')
        self.finance = make_user(self.biz, 'FINANCE_OFFICER', 'efin')
        self.cashier = make_user(self.biz, 'CASHIER',         'ecash')
        self.mgr_c   = auth_client(self.manager)
        self.fin_c   = auth_client(self.finance)
        self.cash_c  = auth_client(self.cashier)
        self.cat     = make_category('Beverages')

    def _payload(self, d=None):
        return {'date': str(d or date.today()), 'category': self.cat.id,
                'amount': '30000', 'description': 'Test'}

    def test_manager_can_create(self):
        r = self.mgr_c.post(URL, self._payload(), format='json')
        self.assertEqual(r.status_code, 201)

    def test_finance_can_create(self):
        r = self.fin_c.post(URL, self._payload(), format='json')
        self.assertEqual(r.status_code, 201)

    def test_cashier_cannot_create(self):
        r = self.cash_c.post(URL, self._payload(), format='json')
        self.assertEqual(r.status_code, 403)

    def test_cashier_cannot_read(self):
        r = self.cash_c.get(URL)
        self.assertEqual(r.status_code, 403)

    def test_business_isolation(self):
        other_biz  = make_business('Other')
        other_user = make_user(other_biz, 'MANAGER', 'other_emgr')
        make_expense(other_biz, other_user, self.cat, amount=999)
        make_expense(self.biz, self.manager, self.cat, amount=111)
        r = self.mgr_c.get(URL)
        amounts = [float(e['amount']) for e in r.json()['results']]
        self.assertIn(111.0, amounts)
        self.assertNotIn(999.0, amounts)

    def test_date_range_filter(self):
        today = date.today()
        make_expense(self.biz, self.manager, self.cat, d=today - timedelta(days=10), amount=100)
        make_expense(self.biz, self.manager, self.cat, d=today, amount=200)
        r = self.mgr_c.get(URL, {'date_from': str(today)})
        amounts = [float(e['amount']) for e in r.json()['results']]
        self.assertIn(200.0, amounts)
        self.assertNotIn(100.0, amounts)

    def test_category_filter(self):
        cat2 = make_category('Cleaning')
        make_expense(self.biz, self.manager, self.cat,  amount=100)
        make_expense(self.biz, self.manager, cat2, amount=200)
        r = self.mgr_c.get(URL, {'category': self.cat.id})
        amounts = [float(e['amount']) for e in r.json()['results']]
        self.assertIn(100.0, amounts)
        self.assertNotIn(200.0, amounts)

    def test_search_filter(self):
        make_expense(self.biz, self.manager, self.cat, amount=100)
        ExpenseReport.objects.filter(business=self.biz).update(description='electricity bill')
        make_expense(self.biz, self.manager, self.cat, amount=200)
        r = self.mgr_c.get(URL, {'search': 'electricity'})
        amounts = [float(e['amount']) for e in r.json()['results']]
        self.assertIn(100.0, amounts)

    def test_manager_can_delete(self):
        e = make_expense(self.biz, self.manager, self.cat)
        r = self.mgr_c.delete(f'{URL}{e.id}/')
        self.assertEqual(r.status_code, 204)

    def test_categories_endpoint(self):
        r = self.mgr_c.get(CAT_URL)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        items = data['results'] if 'results' in data else data
        names = [c['name'] for c in items]
        self.assertIn('Beverages', names)
