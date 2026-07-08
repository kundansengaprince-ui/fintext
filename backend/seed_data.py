"""
Seed 30 days of realistic data for Repub Lounge.
Wipes existing records first so re-running is safe.
Run: python seed_data.py
"""
import os
import django
import random
from datetime import date, timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser
from expenses.models import ExpenseCategory, ExpenseReport
from inventory.models import InventoryItem, InventoryRecord
from sales.models import SalesRecord
from customers.models import CustomerRetentionRecord
from health_score.models import BusinessHealthScore

random.seed(42)

# ── Wipe existing records so re-running is clean ──────────────────────────────
BusinessHealthScore.objects.all().delete()
SalesRecord.objects.all().delete()
ExpenseReport.objects.all().delete()
InventoryRecord.objects.all().delete()
CustomerRetentionRecord.objects.all().delete()
print('  Cleared existing records.')

# ── Expense categories ────────────────────────────────────────────────────────
categories_data = [
    ('Cost of Goods Sold',     'Food and beverage ingredients purchased for resale'),
    ('Staff Salaries',         'Monthly wages and salaries for all employees'),
    ('Utilities',              'Electricity, water, and gas bills'),
    ('Rent',                   'Monthly premises rental'),
    ('Marketing & Promotions', 'Advertising, promotions, and social media spend'),
    ('Maintenance & Repairs',  'Equipment servicing and facility repairs'),
    ('Packaging & Supplies',   'Take-away containers, napkins, cleaning supplies'),
    ('Transport & Delivery',   'Delivery costs and vehicle fuel'),
    ('Miscellaneous',          'Other operational expenses'),
]
for name, desc in categories_data:
    ExpenseCategory.objects.get_or_create(name=name, defaults={'description': desc})
print(f'  {ExpenseCategory.objects.count()} expense categories ready.')

# ── Inventory items ───────────────────────────────────────────────────────────
items_data = [
    ('Rice',               'kg',  25, 1500),
    ('Beef',               'kg',   5, 8000),
    ('Chicken',            'kg',  10, 6000),
    ('Cooking Oil',        'L',    5, 3500),
    ('Vegetables (Mixed)', 'kg',  10,  500),
    ('Tomatoes',           'kg',   5,  800),
    ('Onions',             'kg',   5,  600),
    ('Coca-Cola 500ml',    'btl', 20,  400),
    ('Water 1.5L',         'btl', 30,  300),
    ('Beer Primus',        'btl', 24, 1200),
    ('Bread Loaves',       'pcs', 10, 1500),
    ('Eggs',               'pcs', 30,  250),
]
for name, unit, reorder, unit_cost in items_data:
    InventoryItem.objects.get_or_create(
        name=name,
        defaults={'unit': unit, 'reorder_level': reorder, 'unit_cost': unit_cost}
    )
items = list(InventoryItem.objects.all())
print(f'  {len(items)} inventory items ready.')

# ── Staff ─────────────────────────────────────────────────────────────────────
manager = CustomUser.objects.filter(role='MANAGER').first()
cashier = CustomUser.objects.filter(role='CASHIER').first()
finance = CustomUser.objects.filter(role='FINANCE_OFFICER').first()
floor   = CustomUser.objects.filter(role='FLOOR_STAFF').first()

today = date.today()
START = today - timedelta(days=29)

cogs_cat  = ExpenseCategory.objects.get(name='Cost of Goods Sold')
util_cat  = ExpenseCategory.objects.get(name='Utilities')
pack_cat  = ExpenseCategory.objects.get(name='Packaging & Supplies')
maint_cat = ExpenseCategory.objects.get(name='Maintenance & Repairs')

print(f'\n  Seeding 30 days ({START} → {today})...\n')

for i in range(30):
    day = START + timedelta(days=i)
    is_weekend = day.weekday() >= 4

    # ── Sales ─────────────────────────────────────────────────────────────────
    base = 900_000 if is_weekend else 580_000
    total_sales = Decimal(str(round(random.uniform(base * 0.85, base * 1.20), -3)))
    food_pct    = random.uniform(0.55, 0.70)
    food_sales  = Decimal(str(round(float(total_sales) * food_pct, -2)))
    bev_sales   = total_sales - food_sales
    txns        = random.randint(65 if is_weekend else 38, 130 if is_weekend else 80)

    SalesRecord.objects.create(
        date=day,
        total_sales=total_sales,
        food_sales=food_sales,
        beverage_sales=bev_sales,
        num_transactions=txns,
        created_by=cashier or manager,
    )

    # ── Expenses ──────────────────────────────────────────────────────────────
    # COGS every day — 30–38% of sales
    cogs = Decimal(str(round(float(total_sales) * random.uniform(0.30, 0.38), -2)))
    ExpenseReport.objects.create(
        date=day, category=cogs_cat, amount=cogs,
        description='Daily food & beverage ingredient purchases',
        created_by=finance or manager,
    )

    # Utilities on Mondays
    if day.weekday() == 0:
        ExpenseReport.objects.create(
            date=day, category=util_cat,
            amount=Decimal(str(random.randint(28, 48) * 1000)),
            description='Weekly electricity & water bill',
            created_by=finance or manager,
        )

    # Packaging on Wednesdays
    if day.weekday() == 2:
        ExpenseReport.objects.create(
            date=day, category=pack_cat,
            amount=Decimal(str(random.randint(10, 20) * 1000)),
            description='Packaging supplies restock',
            created_by=finance or manager,
        )

    # Random maintenance (~15% of days)
    if random.random() < 0.15:
        ExpenseReport.objects.create(
            date=day, category=maint_cat,
            amount=Decimal(str(random.randint(20, 80) * 1000)),
            description='Equipment maintenance',
            created_by=finance or manager,
        )

    # ── Inventory — ALL items every day ───────────────────────────────────────
    # Using all items ensures inv_avg_value is always substantial (non-zero turnover)
    for item in items:
        reorder = float(item.reorder_level)
        opening    = Decimal(str(round(random.uniform(reorder * 1.5, reorder * 3.0), 1)))
        received   = Decimal(str(round(random.uniform(reorder * 0.5, reorder * 1.5), 1)))
        used       = Decimal(str(round(random.uniform(reorder * 0.4, reorder * 1.0), 1)))
        wastage    = Decimal(str(round(random.uniform(0, float(used) * 0.04), 1)))
        InventoryRecord.objects.create(
            date=day, item=item,
            opening_quantity=opening,
            quantity_received=received,
            quantity_used=used,
            wastage=wastage,
            created_by=manager,
        )

    # ── Customer retention ────────────────────────────────────────────────────
    total_c    = random.randint(55 if is_weekend else 32, 120 if is_weekend else 70)
    returning  = random.randint(int(total_c * 0.35), int(total_c * 0.65))
    new_c      = total_c - returning

    CustomerRetentionRecord.objects.create(
        date=day,
        new_customers=new_c,
        returning_customers=returning,
        created_by=floor or manager,
    )

    print(f'  {day}  sales=RWF {int(total_sales):,}  txns={txns}  '
          f'customers={total_c}  returning={returning}')

print('\n  Seed complete!')
print('  Next steps:')
print('    1. python manage.py train_model')
print('    2. python compute_all_scores.py')
print('    3. Refresh the dashboard')
