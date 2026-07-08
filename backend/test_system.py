"""
Full system test for Repub Lounge Business Health Score Dashboard.
Tests: models, API endpoints, ML engine, admin registration.
Run: python test_system.py
"""
import os
import sys
import django
import json
import traceback
from datetime import date, timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# -- colour helpers -----------------------------------------------------------
GREEN  = '\033[92m'
RED    = '\033[91m'
YELLOW = '\033[93m'
CYAN   = '\033[96m'
BOLD   = '\033[1m'
RESET  = '\033[0m'

passed = failed = 0

def ok(label):
    global passed
    passed += 1
    print(f"  {GREEN}[PASS]{RESET}  {label}")

def fail(label, err=''):
    global failed
    failed += 1
    print(f"  {RED}[FAIL]{RESET}  {label}")
    if err:
        print(f"         {RED}{err}{RESET}")

def section(title):
    print(f"\n{BOLD}{CYAN}{'='*55}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'='*55}{RESET}")

def check(label, condition, err=''):
    if condition:
        ok(label)
    else:
        fail(label, err)

def run(label, fn):
    try:
        fn()
        ok(label)
    except Exception as e:
        fail(label, str(e))


# =============================================================================
section("1. SETTINGS & CONFIGURATION")
# =============================================================================
from django.conf import settings

check("AUTH_USER_MODEL points to accounts.CustomUser",
      settings.AUTH_USER_MODEL == 'accounts.CustomUser')
check("TIME_ZONE is Africa/Kigali",
      settings.TIME_ZONE == 'Africa/Kigali')
check("DRF token auth configured",
      'rest_framework.authentication.TokenAuthentication' in
      settings.REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'])
check("CORS allows localhost:3000",
      'http://localhost:3000' in settings.CORS_ALLOWED_ORIGINS)
check("ML_MODEL_PATH is configured",
      hasattr(settings, 'ML_MODEL_PATH'))
check("ML model file exists",
      (settings.ML_MODEL_PATH / 'xgboost_model.pkl').exists())


# =============================================================================
section("2. DATABASE MODELS")
# =============================================================================
from django.db import connection

tables = connection.introspection.table_names()
for t in ['accounts_customuser', 'sales_salesrecord', 'expenses_expensecategory',
          'expenses_expensereport', 'inventory_inventoryitem', 'inventory_inventoryrecord',
          'customers_customerretentionrecord', 'health_score_businesshealthscore',
          'health_score_mlmodellog', 'authtoken_token']:
    check(f"Table '{t}' exists", t in tables)


# =============================================================================
section("3. ACCOUNTS - CustomUser Model")
# =============================================================================
from accounts.models import CustomUser, Business as _Business

check("Superuser 'admin' exists", CustomUser.objects.filter(username='admin').exists())

# Resolve the business used for all test data
_admin_user = CustomUser.objects.get(username='admin')
_test_business = _admin_user.business or _Business.objects.first()

def create_test_users():
    for username, role in [
        ('mgr_test',   'MANAGER'),
        ('cashier_test', 'CASHIER'),
        ('finance_test', 'FINANCE_OFFICER'),
    ]:
        CustomUser.objects.get_or_create(
            username=username,
            defaults={'role': role, 'email': f'{username}@test.rw', 'password': 'x',
                      'business': _test_business}
        )
run("Create test users for each role", create_test_users)

mgr = CustomUser.objects.get(username='mgr_test')
check("is_manager property works", mgr.is_manager)
check("is_cashier property returns False for manager", not mgr.is_cashier)
check("__str__ includes role display", 'Manager' in str(mgr))


# =============================================================================
section("4. SALES - SalesRecord Model")
# =============================================================================
from sales.models import SalesRecord

TEST_DATE = date.today() - timedelta(days=2)

SalesRecord.objects.filter(date=TEST_DATE, business=_test_business).delete()

def create_sales():
    s = SalesRecord.objects.create(
        date=TEST_DATE,
        total_sales=Decimal('850000'),
        num_transactions=92,
        food_sales=Decimal('520000'),
        beverage_sales=Decimal('330000'),
        business=_test_business,
        created_by=CustomUser.objects.get(username='cashier_test'),
    )
    return s
run("Create SalesRecord", create_sales)

s = SalesRecord.objects.get(date=TEST_DATE, business=_test_business)
check("total_sales saved correctly", s.total_sales == Decimal('850000'))
check("avg_transaction_value auto-calculated",
      s.avg_transaction_value is not None and s.avg_transaction_value > 0)
expected_avg = Decimal('850000') / 92
check("avg_transaction_value is correct",
      abs(s.avg_transaction_value - expected_avg) < Decimal('1'))
check("__str__ shows date and amount", '850' in str(s))


# =============================================================================
section("5. EXPENSES - ExpenseCategory & ExpenseReport Models")
# =============================================================================
from expenses.models import ExpenseCategory, ExpenseReport

check("9 default categories seeded", ExpenseCategory.objects.count() >= 9)
food_cat = ExpenseCategory.objects.filter(name='Food & Beverage Supplies').first()
check("'Food & Beverage Supplies' category exists", food_cat is not None)

ExpenseReport.objects.filter(date=TEST_DATE, business=_test_business).delete()
def create_expense():
    return ExpenseReport.objects.create(
        date=TEST_DATE,
        category=food_cat,
        amount=Decimal('340000'),
        description='Weekly ingredient purchase',
        business=_test_business,
        created_by=CustomUser.objects.get(username='finance_test'),
    )
run("Create ExpenseReport", create_expense)

e = ExpenseReport.objects.get(date=TEST_DATE, business=_test_business, category=food_cat)
check("amount saved correctly", e.amount == Decimal('340000'))
check("__str__ shows category and amount", 'Food & Beverage Supplies' in str(e))


# =============================================================================
section("6. INVENTORY - InventoryItem & InventoryRecord Models")
# =============================================================================
from inventory.models import InventoryItem, InventoryRecord

check("Inventory items seeded", InventoryItem.objects.count() >= 1)
rice = InventoryItem.objects.filter(name='Rice').first()
check("'Rice' inventory item exists", rice is not None)
check("Rice unit_cost is set", rice is not None and rice.unit_cost >= 0)

InventoryRecord.objects.filter(date=TEST_DATE, item=rice, business=_test_business).delete()
def create_inventory_record():
    return InventoryRecord.objects.create(
        date=TEST_DATE,
        item=rice,
        opening_quantity=Decimal('50'),
        quantity_received=Decimal('20'),
        quantity_used=Decimal('35'),
        wastage=Decimal('2'),
        business=_test_business,
        created_by=CustomUser.objects.get(username='finance_test'),
    )
run("Create InventoryRecord", create_inventory_record)

r = InventoryRecord.objects.get(date=TEST_DATE, item=rice, business=_test_business)
expected_closing = Decimal('50') + Decimal('20') - Decimal('35') - Decimal('2')
check("closing_quantity auto-calculated", r.closing_quantity == expected_closing,
      f"Got {r.closing_quantity}, expected {expected_closing}")


# =============================================================================
section("7. CUSTOMERS - CustomerRetentionRecord Model")
# =============================================================================
from customers.models import CustomerRetentionRecord

CustomerRetentionRecord.objects.filter(date=TEST_DATE, business=_test_business).delete()
def create_retention():
    return CustomerRetentionRecord.objects.create(
        date=TEST_DATE,
        new_customers=38,
        returning_customers=54,
        business=_test_business,
        created_by=CustomUser.objects.get(username='mgr_test'),
    )
run("Create CustomerRetentionRecord", create_retention)

cr = CustomerRetentionRecord.objects.get(date=TEST_DATE, business=_test_business)
check("total_customers auto-summed", cr.total_customers == 92)
expected_rate = (Decimal('54') / Decimal('92')) * 100
check("retention_rate auto-calculated",
      abs(cr.retention_rate - expected_rate) < Decimal('0.1'),
      f"Got {cr.retention_rate}, expected ~{expected_rate:.2f}")


# =============================================================================
section("8. ML ENGINE - XGBoost + SHAP")
# =============================================================================
from ml.engine import load_model, predict_score, compute_kpis, generate_synthetic_training_data, train_model

model = load_model(str(settings.ML_MODEL_PATH))
check("Model loads from disk", model is not None)

def test_kpi_computation():
    kpis = compute_kpis(
        sales={'total_sales': 850000, 'num_transactions': 92},
        expenses={'total_expenses': 510000, 'cost_of_goods': 340000},
        inventory_records={'quantity_used_value': 52500, 'avg_inventory_value': 42000},
        retention={'retention_rate': 58.7},
    )
    assert 'gross_profit_margin' in kpis
    assert 'expense_to_revenue_ratio' in kpis
    assert kpis['gross_profit_margin'] > 0
    assert kpis['expense_to_revenue_ratio'] > 0
run("compute_kpis returns all features", test_kpi_computation)

kpis = compute_kpis(
    sales={'total_sales': 850000, 'num_transactions': 92},
    expenses={'total_expenses': 510000, 'cost_of_goods': 340000},
    inventory_records={'quantity_used_value': 52500, 'avg_inventory_value': 42000},
    retention={'retention_rate': 58.7},
)

def test_prediction():
    result = predict_score(model, kpis)
    assert 'score' in result
    assert 'shap_values' in result
    assert 'recommendations' in result
    assert 0 <= result['score'] <= 100
    assert len(result['shap_values']) == 6
run("predict_score returns valid result", test_prediction)

result = predict_score(model, kpis)
check(f"Score is in valid range 0-100 (got {result['score']})",
      0 <= result['score'] <= 100)
check("SHAP values returned for all 6 features",
      len(result['shap_values']) == 6)
check("Recommendations list returned",
      isinstance(result['recommendations'], list))
# Each recommendation has 'actions' (list) not 'action'
check("Each recommendation has 'actions' field",
      all('actions' in rec for rec in result['recommendations']))

# Test score direction: better data -> higher score
kpis_good = compute_kpis(
    sales={'total_sales': 2000000, 'num_transactions': 200},
    expenses={'total_expenses': 600000, 'cost_of_goods': 300000},
    inventory_records={'quantity_used_value': 150000, 'avg_inventory_value': 50000},
    retention={'retention_rate': 80},
)
kpis_bad = compute_kpis(
    sales={'total_sales': 200000, 'num_transactions': 20},
    expenses={'total_expenses': 300000, 'cost_of_goods': 200000},
    inventory_records={'quantity_used_value': 10000, 'avg_inventory_value': 50000},
    retention={'retention_rate': 10},
)
score_good = predict_score(model, kpis_good)['score']
score_bad  = predict_score(model, kpis_bad)['score']
check(f"Higher-performing business scores higher ({score_good:.1f} > {score_bad:.1f})",
      score_good > score_bad)


# =============================================================================
section("9. HEALTH SCORE SERVICE - End-to-End Computation")
# =============================================================================
from health_score.services import compute_score_for_date
from health_score.models import BusinessHealthScore, MLModelLog

BusinessHealthScore.objects.filter(date=TEST_DATE, business=_test_business).delete()
def test_score_service():
    score = compute_score_for_date(TEST_DATE, _test_business)
    assert score.pk is not None
    assert 0 <= float(score.score) <= 100
    assert score.label in ['CRITICAL', 'POOR', 'FAIR', 'GOOD', 'EXCELLENT']
    assert score.shap_values
    assert isinstance(score.recommendations, list)
run("compute_score_for_date creates BusinessHealthScore", test_score_service)

score_obj = BusinessHealthScore.objects.get(date=TEST_DATE, business=_test_business)
check(f"Score label assigned correctly (got '{score_obj.label}')",
      score_obj.label in ['CRITICAL', 'POOR', 'FAIR', 'GOOD', 'EXCELLENT'])
check("SHAP values stored in DB", bool(score_obj.shap_values))
check("KPIs stored in DB", score_obj.gross_profit_margin is not None)
check("total_sales stored", score_obj.total_sales is not None and score_obj.total_sales > 0)

# Idempotent -- running twice updates in place
def test_idempotent():
    score2 = compute_score_for_date(TEST_DATE, _test_business)
    assert BusinessHealthScore.objects.filter(date=TEST_DATE, business=_test_business).count() == 1
run("compute_score_for_date is idempotent (no duplicate rows)", test_idempotent)

check("MLModelLog has active model", MLModelLog.objects.filter(is_active=True).exists())
log = MLModelLog.objects.filter(is_active=True).first()
check(f"Active model R2={log.r2_score:.4f} is above 0.90", log.r2_score > 0.90)


# =============================================================================
section("10. BUSINESSHEALTHSCORE MODEL - Label & Trend Logic")
# =============================================================================
from health_score.models import BusinessHealthScore

score_cases = [
    (Decimal('85'), 'EXCELLENT'),
    (Decimal('70'), 'GOOD'),
    (Decimal('55'), 'FAIR'),
    (Decimal('38'), 'POOR'),
    (Decimal('20'), 'CRITICAL'),
]
for s, expected_label in score_cases:
    obj = BusinessHealthScore(date=date(2025, 1, 1), score=s)
    actual = obj._compute_label()
    check(f"Score {s} -> label '{expected_label}'", actual == expected_label,
          f"Got '{actual}'")


# =============================================================================
section("11. DJANGO ADMIN - Registration Check")
# =============================================================================
from django.contrib import admin

registered = {m.__name__ for m, _ in admin.site._registry.items()}
for model_name in ['CustomUser', 'SalesRecord', 'ExpenseCategory', 'ExpenseReport',
                   'InventoryItem', 'InventoryRecord', 'CustomerRetentionRecord',
                   'BusinessHealthScore', 'MLModelLog']:
    check(f"'{model_name}' registered in Django admin", model_name in registered)


# =============================================================================
section("12. DRF SERIALIZERS")
# =============================================================================
from sales.serializers import SalesRecordSerializer
from expenses.serializers import ExpenseReportSerializer, ExpenseCategorySerializer
from inventory.serializers import InventoryItemSerializer, InventoryRecordSerializer
from customers.serializers import CustomerRetentionSerializer
from health_score.serializers import BusinessHealthScoreSerializer
from accounts.serializers import LoginSerializer

s_obj = SalesRecord.objects.get(date=TEST_DATE, business=_test_business)
data = SalesRecordSerializer(s_obj).data
check("SalesRecordSerializer serialises correctly",
      str(data['total_sales']) == '850000.00')

e_obj = ExpenseReport.objects.get(date=TEST_DATE, business=_test_business, category=food_cat)
data = ExpenseReportSerializer(e_obj).data
check("ExpenseReportSerializer includes category_name",
      data.get('category_name') == 'Food & Beverage Supplies')

hs_obj = BusinessHealthScore.objects.get(date=TEST_DATE, business=_test_business)
data = BusinessHealthScoreSerializer(hs_obj).data
check("BusinessHealthScoreSerializer includes shap_values", 'shap_values' in data)
check("BusinessHealthScoreSerializer includes recommendations", 'recommendations' in data)

valid = LoginSerializer(data={'username': 'admin', 'password': 'admin1234'})
check("LoginSerializer validates correct credentials", valid.is_valid())

invalid = LoginSerializer(data={'username': 'admin', 'password': 'wrongpassword'})
check("LoginSerializer rejects wrong credentials", not invalid.is_valid())


# =============================================================================
section("13. URL ROUTING")
# =============================================================================
from django.urls import reverse, NoReverseMatch

url_names = [
    ('login',            []),
    ('me',               []),
    ('sales-list',       []),
    ('sales-detail',     [1]),
    ('expense-list',     []),
    ('expense-detail',   [1]),
    ('retention-list',   []),
    ('retention-detail', [1]),
    ('score-latest',     []),
    ('score-history',    []),
    ('score-compute',    []),
    ('score-summary',    []),
]
for name, args in url_names:
    try:
        url = reverse(name, args=args)
        ok(f"URL '{name}' resolves -> {url}")
    except NoReverseMatch as e:
        fail(f"URL '{name}' not found", str(e))


# =============================================================================
section("14. API VIEWS - Request/Response (Django test client)")
# =============================================================================
from django.test import Client

client = Client()
# Django test client sends HOST: testserver -- add it temporarily
settings.ALLOWED_HOSTS += ['testserver']

# Login as admin (superuser check)
resp = client.post('/api/auth/login/',
                   data=json.dumps({'username': 'admin', 'password': 'admin1234'}),
                   content_type='application/json')
check("POST /api/auth/login/ -> 200", resp.status_code == 200)
admin_token = resp.json().get('token')
check("Login response contains token", bool(admin_token))

# Me (admin)
admin_auth = {'HTTP_AUTHORIZATION': f'Token {admin_token}'}
resp = client.get('/api/auth/me/', **admin_auth)
check("GET /api/auth/me/ -> 200", resp.status_code == 200)
check("Me response has username=admin", resp.json().get('username') == 'admin')

# Use manager user for role-protected endpoints
from accounts.models import CustomUser as _CU
from rest_framework.authtoken.models import Token as _Token
_mgr_user = _CU.objects.filter(business=_test_business, role='MANAGER').first()
if _mgr_user:
    _mgr_user.set_password('TestPass123!')
    _mgr_user.save(update_fields=['password'])
_mgr_token, _ = _Token.objects.get_or_create(user=_mgr_user)
token = _mgr_token.key
auth = {'HTTP_AUTHORIZATION': f'Token {token}'}

# Sales
resp = client.get('/api/sales/', **auth)
check("GET /api/sales/ -> 200", resp.status_code == 200)
check("Sales list is paginated", 'results' in resp.json())

resp = client.post('/api/sales/',
    data=json.dumps({
        'date': str(date.today() - timedelta(days=1)),
        'total_sales': '720000.00',
        'num_transactions': 78,
        'food_sales': '430000.00',
        'beverage_sales': '290000.00',
    }),
    content_type='application/json', **auth)
check("POST /api/sales/ -> 201", resp.status_code == 201,
      resp.content.decode()[:200])

# Expenses
resp = client.get('/api/expenses/', **auth)
check("GET /api/expenses/ -> 200", resp.status_code == 200)

resp = client.get('/api/expenses/categories/', **auth)
check("GET /api/expenses/categories/ -> 200", resp.status_code == 200)

# Inventory
resp = client.get('/api/inventory/items/', **auth)
check("GET /api/inventory/items/ -> 200", resp.status_code == 200)
check("Inventory items list has results", resp.json().get('count', 0) >= 1)

resp = client.get('/api/inventory/records/', **auth)
check("GET /api/inventory/records/ -> 200", resp.status_code == 200)

# Customers
resp = client.get('/api/customers/', **auth)
check("GET /api/customers/ -> 200", resp.status_code == 200)

# Health score endpoints
resp = client.get('/api/health-score/latest/', **auth)
check("GET /api/health-score/latest/ -> 200", resp.status_code == 200)

resp = client.get('/api/health-score/history/?days=30', **auth)
check("GET /api/health-score/history/?days=30 -> 200", resp.status_code == 200)
check("History returns a list", isinstance(resp.json(), list))

resp = client.get('/api/health-score/summary/', **auth)
check("GET /api/health-score/summary/ -> 200", resp.status_code == 200)
summary = resp.json()
check("Summary has latest_score", 'latest_score' in summary)
check("Summary has recommendations", 'recommendations' in summary)

resp = client.post('/api/health-score/compute/',
    data=json.dumps({'date': str(TEST_DATE)}),
    content_type='application/json', **auth)
check("POST /api/health-score/compute/ -> 200", resp.status_code == 200,
      resp.content.decode()[:200])

# Unauthenticated request should be blocked
resp = client.get('/api/sales/')
check("GET /api/sales/ without token -> 401/403",
      resp.status_code in [401, 403])

# Logout (admin)
resp = client.post('/api/auth/logout/', **admin_auth)
check("POST /api/auth/logout/ -> 200", resp.status_code == 200)

# After logout, admin token is invalid
resp = client.get('/api/auth/me/', **admin_auth)
check("Token invalidated after logout -> 401", resp.status_code == 401)


# =============================================================================
section("15. CLEANUP TEST DATA")
# =============================================================================
def cleanup():
    SalesRecord.objects.filter(date=date.today() - timedelta(days=1), business=_test_business).delete()
    BusinessHealthScore.objects.filter(date=TEST_DATE, business=_test_business).delete()
    ExpenseReport.objects.filter(date=TEST_DATE, business=_test_business).delete()
    InventoryRecord.objects.filter(date=TEST_DATE, business=_test_business).delete()
    CustomerRetentionRecord.objects.filter(date=TEST_DATE, business=_test_business).delete()
    CustomUser.objects.filter(username__endswith='_test').delete()
run("Test data cleaned up", cleanup)


# =============================================================================
print(f"\n{BOLD}{'='*55}{RESET}")
print(f"{BOLD}  RESULTS{RESET}")
print(f"{BOLD}{'='*55}{RESET}")
print(f"  {GREEN}Passed : {passed}{RESET}")
print(f"  {RED}Failed : {failed}{RESET}")
total = passed + failed
pct   = int(passed / total * 100) if total else 0
bar_len = 40
filled  = int(bar_len * passed / total) if total else 0
bar = f"{GREEN}{'#' * filled}{RESET}{'-' * (bar_len - filled)}"
print(f"  [{bar}] {pct}%")
print(f"{BOLD}{'='*55}{RESET}\n")
sys.exit(0 if failed == 0 else 1)
