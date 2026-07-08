"""
Backfills audit log entries for all records created by seed_data.py.
Run: python backfill_audit.py
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser
from sales.models import SalesRecord
from expenses.models import ExpenseReport
from inventory.models import InventoryRecord
from customers.models import CustomerRetentionRecord
from health_score.models import BusinessHealthScore
from audit.models import AuditLog

# Clear existing audit logs so we don't duplicate
AuditLog.objects.all().delete()
print('  Cleared existing audit logs.')

manager = CustomUser.objects.filter(role='MANAGER').first()
cashier = CustomUser.objects.filter(role='CASHIER').first()
finance = CustomUser.objects.filter(role='FINANCE_OFFICER').first()
floor   = CustomUser.objects.filter(role='FLOOR_STAFF').first()

logs = []

# ── Team accounts ─────────────────────────────────────────────────────────────
for user in CustomUser.objects.all():
    logs.append(AuditLog(
        user=manager, action=AuditLog.Action.CREATE,
        module='Team', object_id=str(user.id),
        detail=f'Created user {user.username} ({user.role})',
        timestamp=user.date_joined,
    ))

# ── Sales records ─────────────────────────────────────────────────────────────
for r in SalesRecord.objects.all():
    logs.append(AuditLog(
        user=r.created_by or cashier, action=AuditLog.Action.CREATE,
        module='Sales', object_id=str(r.id),
        detail=f'Sales record for {r.date} — RWF {r.total_sales:,}',
        timestamp=r.created_at,
    ))

# ── Expense reports ───────────────────────────────────────────────────────────
for r in ExpenseReport.objects.select_related('category').all():
    logs.append(AuditLog(
        user=r.created_by or finance, action=AuditLog.Action.CREATE,
        module='Expenses', object_id=str(r.id),
        detail=f'Expense {r.category} — RWF {r.amount:,} on {r.date}',
        timestamp=r.created_at,
    ))

# ── Inventory records ─────────────────────────────────────────────────────────
for r in InventoryRecord.objects.select_related('item').all():
    logs.append(AuditLog(
        user=r.created_by or manager, action=AuditLog.Action.CREATE,
        module='Inventory', object_id=str(r.id),
        detail=f'Inventory record {r.item.name} on {r.date}',
        timestamp=r.created_at,
    ))

# ── Customer retention records ────────────────────────────────────────────────
for r in CustomerRetentionRecord.objects.all():
    logs.append(AuditLog(
        user=r.created_by or floor, action=AuditLog.Action.CREATE,
        module='Customers', object_id=str(r.id),
        detail=f'Customer record for {r.date} — {r.total_customers} customers ({r.retention_rate}% retention)',
        timestamp=r.created_at,
    ))

# ── Health scores ─────────────────────────────────────────────────────────────
for r in BusinessHealthScore.objects.all():
    logs.append(AuditLog(
        user=manager, action=AuditLog.Action.COMPUTE,
        module='Dashboard', object_id=str(r.id),
        detail=f'Computed health score for {r.date} — {r.score} ({r.label})',
        timestamp=r.created_at,
    ))

# ── Bulk insert ───────────────────────────────────────────────────────────────
AuditLog.objects.bulk_create(logs)
print(f'  Created {len(logs)} audit log entries.')
print('\n  Breakdown:')
for action, label in AuditLog.Action.choices:
    count = sum(1 for l in logs if l.action == action)
    if count:
        print(f'    {label:20s} {count}')
