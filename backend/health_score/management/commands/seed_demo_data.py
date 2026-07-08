"""
Seed 60 days of realistic demo data for a restaurant business and compute health scores.
Run:  python manage.py seed_demo_data
Add --flush to wipe existing records first.
"""
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Business, CustomUser
from sales.models import SalesRecord
from expenses.models import ExpenseCategory, ExpenseReport
from inventory.models import InventoryItem, InventoryRecord
from customers.models import CustomerRetentionRecord
from health_score.services import compute_score_for_date


SEED = 42
random.seed(SEED)


def rand(lo, hi):
    return round(random.uniform(lo, hi), 2)


def randint(lo, hi):
    return random.randint(lo, hi)


class Command(BaseCommand):
    help = 'Seed 60 days of demo data and compute health scores'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true',
                            help='Delete all existing records before seeding')
        parser.add_argument('--days', type=int, default=60,
                            help='Number of days to seed (default: 60)')

    def handle(self, *args, **options):
        # --- Get or create the demo business ---
        business, created = Business.objects.get_or_create(
            name='Repub Lounge',
            defaults={
                'business_type': 'RESTAURANT',
                'location': 'Kigali, Rwanda',
                'phone': '+250 788 000 000',
                'email': 'info@republlounge.rw',
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  Created business: {business.name}'))
        else:
            self.stdout.write(f'  Using existing business: {business.name}')

        # --- Assign all users without a business to this one ---
        CustomUser.objects.filter(business__isnull=True).exclude(
            username='admin'
        ).update(business=business)

        if options['flush']:
            self.stdout.write('Flushing existing records...')
            from health_score.models import BusinessHealthScore
            BusinessHealthScore.objects.filter(business=business).delete()
            CustomerRetentionRecord.objects.filter(business=business).delete()
            InventoryRecord.objects.filter(business=business).delete()
            ExpenseReport.objects.filter(business=business).delete()
            SalesRecord.objects.filter(business=business).delete()
            self.stdout.write(self.style.WARNING('  Records deleted.'))

        days = options['days']
        today = date.today()
        start = today - timedelta(days=days - 1)

        manager = CustomUser.objects.filter(business=business, role='MANAGER').first()
        cashier = CustomUser.objects.filter(business=business, role='CASHIER').first()
        finance = CustomUser.objects.filter(business=business, role='FINANCE_OFFICER').first()
        floor   = CustomUser.objects.filter(business=business, role='FLOOR_STAFF').first()

        created_by_sales    = cashier or manager
        created_by_expenses = finance or manager
        created_by_inv      = manager
        created_by_cust     = floor or manager

        # --- Expense categories ---
        cat_names = [
            'Food & Beverage Supplies', 'Staff Salaries', 'Utilities',
            'Rent', 'Maintenance & Repairs', 'Marketing & Advertising',
            'Transport & Delivery', 'Cleaning & Supplies', 'Miscellaneous',
        ]
        categories = {}
        for name in cat_names:
            obj, _ = ExpenseCategory.objects.get_or_create(name=name)
            categories[name] = obj

        # --- Inventory items ---
        items_def = [
            ('Beef',           'kg',  4500, 5),
            ('Beer (Primus)',  'btl',  700, 24),
            ('Rice',           'kg',   900, 10),
            ('Cooking Oil',    'L',   2200, 5),
            ('Soft Drinks',    'btl',  400, 30),
        ]
        inv_items = {}
        for name, unit, cost, reorder in items_def:
            obj, _ = InventoryItem.objects.get_or_create(
                name=name,
                business=business,
                defaults={'unit': unit, 'unit_cost': cost, 'reorder_level': reorder, 'is_active': True},
            )
            inv_items[name] = obj

        closing = {name: rand(20, 40) for name in inv_items}

        self.stdout.write(f'Seeding {days} days ({start} to {today})...')

        with transaction.atomic():
            for i in range(days):
                d = start + timedelta(days=i)
                is_weekend = d.weekday() >= 4

                # Simulate a gradual improvement trend over 60 days
                # First 20 days: struggling, middle 20: recovering, last 20: thriving
                phase = i / days  # 0.0 → 1.0

                # --- Sales ---
                if phase < 0.33:
                    base_sales = rand(280_000, 480_000) if is_weekend else rand(180_000, 320_000)
                elif phase < 0.66:
                    base_sales = rand(450_000, 680_000) if is_weekend else rand(300_000, 520_000)
                else:
                    base_sales = rand(650_000, 950_000) if is_weekend else rand(450_000, 720_000)

                food_pct = rand(0.55, 0.65)
                food = round(base_sales * food_pct, 2)
                bev  = round(base_sales * (1 - food_pct), 2)
                txns = randint(70, 130) if is_weekend else randint(45, 90)

                SalesRecord.objects.get_or_create(
                    date=d,
                    business=business,
                    defaults=dict(
                        total_sales=base_sales,
                        food_sales=food,
                        beverage_sales=bev,
                        num_transactions=txns,
                        notes='Demo data',
                        created_by=created_by_sales,
                    )
                )

                # --- Expenses ---
                # Expense ratio improves over time (high early, lower later)
                expense_ratio = rand(0.72, 0.85) if phase < 0.33 else \
                                rand(0.60, 0.72) if phase < 0.66 else \
                                rand(0.45, 0.60)
                expense_budget = base_sales * expense_ratio

                daily_cats = random.sample(list(categories.values()), 3)
                splits = sorted([rand(0.1, 0.9) for _ in range(2)])
                fracs = [splits[0], splits[1] - splits[0], 1 - splits[1]]
                for cat, frac in zip(daily_cats, fracs):
                    amount = round(expense_budget * frac, 2)
                    if amount < 1000:
                        amount = 1000.00
                    ExpenseReport.objects.get_or_create(
                        date=d,
                        business=business,
                        category=cat,
                        defaults=dict(
                            amount=amount,
                            description='Demo data',
                            created_by=created_by_expenses,
                        ),
                    )

                # --- Inventory ---
                for name, item in inv_items.items():
                    opening  = round(max(closing[name], 0), 2)
                    used     = rand(8, 18)
                    wastage  = rand(0.5, 2.5) if phase < 0.33 else (rand(0, 1) if random.random() < 0.3 else 0)
                    shortfall = used + wastage - opening + rand(5, 15)
                    received  = round(max(rand(5, 20) if random.random() < 0.5 else 0,
                                         shortfall if shortfall > 0 else 0), 2)

                    rec, _ = InventoryRecord.objects.get_or_create(
                        date=d,
                        business=business,
                        item=item,
                        defaults=dict(
                            opening_quantity=opening,
                            quantity_received=received,
                            quantity_used=used,
                            wastage=wastage,
                            created_by=created_by_inv,
                        )
                    )
                    closing[name] = float(rec.closing_quantity)

                # --- Customer Retention ---
                # Retention improves over time
                ret_lo = 0.30 if phase < 0.33 else 0.42 if phase < 0.66 else 0.58
                ret_hi = 0.45 if phase < 0.33 else 0.58 if phase < 0.66 else 0.72
                total  = randint(60, 140) if is_weekend else randint(40, 100)
                returning = randint(int(total * ret_lo), int(total * ret_hi))
                new_c = total - returning

                CustomerRetentionRecord.objects.get_or_create(
                    date=d,
                    business=business,
                    defaults=dict(
                        new_customers=new_c,
                        returning_customers=returning,
                        notes='Demo data',
                        created_by=created_by_cust,
                    )
                )

                self.stdout.write(
                    f'  [{i+1:02d}/{days}] {d}  RWF {base_sales:,.0f}  txns={txns}  ret={returning}/{total}',
                    ending='\r'
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Data seeded for {days} days.'))

        # --- Compute health scores ---
        self.stdout.write('Computing health scores...')
        scores_computed = 0
        for i in range(days):
            d = start + timedelta(days=i)
            try:
                score = compute_score_for_date(d, business)
                scores_computed += 1
                self.stdout.write(
                    f'  {d}  {score.score:5.1f}  [{score.label:9s}]  {score.trend}',
                    ending='\r'
                )
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'\n  {d}  skipped: {e}'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {days} days seeded, {scores_computed} health scores computed.'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'Login as manager and the dashboard will show a full 60-day trend.'
        ))
