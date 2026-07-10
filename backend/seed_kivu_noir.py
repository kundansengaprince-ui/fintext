"""
Seeds 30 days of realistic data for Kivu Noir café.
Run: python seed_kivu_noir.py
"""
import os, django, random
from decimal import Decimal
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from datetime import date, timedelta
from accounts.models import Business, CustomUser
from sales.models import SalesRecord
from expenses.models import ExpenseCategory, ExpenseReport
from inventory.models import InventoryItem, InventoryRecord
from customers.models import CustomerRetentionRecord
from health_score.services import compute_score_for_date

business, _ = Business.objects.get_or_create(
    name='Kivu Noir',
    defaults={'business_type': 'CAFE', 'location': 'Kigali, Rwanda',
              'email': 'info@kivunoir.rw', 'phone': '+250 788 111 111'}
)
manager, created = CustomUser.objects.get_or_create(
    username='kivunoir',
    defaults={'first_name': 'Kivu', 'last_name': 'Noir', 'role': 'MANAGER', 'business': business}
)
if created:
    manager.set_password('kivunoir123')
    manager.save()

rng = random.Random(42)

# --- Inventory items ---
items_data = [
    ('Coffee Beans',   'kg',  4500),
    ('Milk',           'L',   800),
    ('Sugar',          'kg',  600),
    ('Pastry Mix',     'kg',  3200),
    ('Tea Leaves',     'kg',  2800),
    ('Juice Bottles',  'btl', 1200),
    ('Disposable Cups','pck', 950),
]
items = []
for name, unit, cost in items_data:
    item, _ = InventoryItem.objects.get_or_create(
        name=name, business=business,
        defaults={'unit': unit, 'unit_cost': Decimal(cost), 'reorder_level': 5}
    )
    items.append(item)

# --- Expense categories ---
cat_names = ['Cost of Goods', 'Rent', 'Utilities', 'Staff Wages', 'Marketing', 'Maintenance']
categories = []
for name in cat_names:
    cat, _ = ExpenseCategory.objects.get_or_create(name=f'{name} (Kivu Noir)')
    categories.append(cat)

today = date.today()

for i in range(30):
    d = today - timedelta(days=29 - i)

    # Sales — café daily range 180k–420k RWF
    is_weekend = d.weekday() >= 5
    base = rng.randint(280000, 420000) if is_weekend else rng.randint(180000, 320000)
    total = Decimal(base)
    txns  = rng.randint(40, 95) if is_weekend else rng.randint(25, 65)
    food  = total * Decimal('0.45')
    bev   = total * Decimal('0.55')

    SalesRecord.objects.update_or_create(
        business=business, date=d,
        defaults=dict(total_sales=total, num_transactions=txns,
                      food_sales=food, beverage_sales=bev, created_by=manager)
    )

    # Expenses
    expense_amounts = [
        (categories[0], float(total) * rng.uniform(0.28, 0.38)),  # COGS
        (categories[1], 250000 / 30),                              # Rent daily share
        (categories[2], rng.randint(8000, 15000)),                 # Utilities
        (categories[3], 180000 / 30),                              # Wages daily share
    ]
    if rng.random() < 0.3:
        expense_amounts.append((categories[4], rng.randint(5000, 20000)))  # Marketing
    for cat, amount in expense_amounts:
        ExpenseReport.objects.get_or_create(
            business=business, date=d, category=cat,
            defaults=dict(amount=Decimal(str(round(amount, 0))), created_by=manager)
        )

    # Inventory
    for item in items:
        opening = Decimal(rng.uniform(8, 25))
        received = Decimal(rng.uniform(0, 10))
        used = Decimal(rng.uniform(4, 12))
        wastage = Decimal(rng.uniform(0, 1))
        InventoryRecord.objects.update_or_create(
            business=business, date=d, item=item,
            defaults=dict(opening_quantity=opening, quantity_received=received,
                          quantity_used=used, wastage=wastage, created_by=manager)
        )

    # Customers
    total_c    = rng.randint(30, 90) if is_weekend else rng.randint(20, 60)
    returning  = int(total_c * rng.uniform(0.45, 0.72))
    new_c      = total_c - returning
    CustomerRetentionRecord.objects.update_or_create(
        business=business, date=d,
        defaults=dict(new_customers=new_c, returning_customers=returning, created_by=manager)
    )

    print(f'  {d}  sales=RWF {total:,.0f}  txns={txns}  customers={total_c}')

print('\nComputing health scores...')
for i in range(30):
    d = today - timedelta(days=29 - i)
    try:
        score = compute_score_for_date(d, business)
        print(f'  {d}  score={score.score}  ({score.label})')
    except Exception as e:
        print(f'  {d}  ERROR: {e}')

print('\nKivu Noir seeded successfully!')
