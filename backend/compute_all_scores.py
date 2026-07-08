"""
Computes health scores for every date that has sales data.
Run: python compute_all_scores.py
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import Business
from sales.models import SalesRecord
from health_score.services import compute_score_for_date

for business in Business.objects.filter(is_active=True):
    dates = SalesRecord.objects.filter(business=business).values_list('date', flat=True).order_by('date')
    if not dates:
        print(f'[{business.name}] No sales records found. Run seed_demo_data first.')
        continue

    print(f'\n[{business.name}] Computing {len(dates)} scores...\n')
    for d in dates:
        try:
            score = compute_score_for_date(d, business)
            print(f'  {d}  →  {score.score:5.1f}  ({score.label})  {score.trend}')
        except Exception as e:
            print(f'  {d}  →  ERROR: {e}')

print('\nDone.')
