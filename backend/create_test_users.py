"""
Seeds two demo businesses with isolated teams.
Run: python create_test_users.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser, Business


def seed_business(biz_data, users):
    biz, created = Business.objects.get_or_create(
        name=biz_data['name'], defaults=biz_data
    )
    print(f"{'Created' if created else 'Exists'}  business: {biz.name}")
    for u in users:
        pw = u.pop('password')
        obj, created = CustomUser.objects.get_or_create(
            username=u['username'],
            defaults={**u, 'business': biz}
        )
        obj.business = biz
        obj.role = u['role']
        obj.set_password(pw)
        obj.save()
        print(f"  {'Created' if created else 'Updated'}  {obj.username:12s}  ({obj.role})")
        u['password'] = pw  # restore for reuse safety
    return biz


# ── Kivu Noir ────────────────────────────────────────────────────────────────
seed_business(
    {'name': 'Kivu Noir', 'business_type': 'CAFE',
     'location': 'Kigali, Rwanda', 'email': 'info@kivunoir.rw', 'phone': '+250 788 111 111'},
    [
        dict(username='kivunoir', first_name='Kivu',    last_name='Noir',       role='MANAGER',         password='kivunoir123'),
        dict(username='cashier',  first_name='Alice',   last_name='Uwase',      role='CASHIER',         password='cashier123'),
        dict(username='finance',  first_name='Robert',  last_name='Nkurunziza', role='FINANCE_OFFICER', password='finance123'),
        dict(username='waiter',   first_name='Grace',   last_name='Mutesi',     role='FLOOR_STAFF',     password='waiter123'),
    ]
)

# ── Repub Lounge ─────────────────────────────────────────────────────────────
seed_business(
    {'name': 'Repub Lounge', 'business_type': 'RESTAURANT',
     'location': 'Kimihurura, Kigali', 'email': 'info@republounge.rw', 'phone': '+250 788 000 000'},
    [
        dict(username='manager',  first_name='Jean',    last_name='Claude',     role='MANAGER',         password='manager123'),
        dict(username='itadmin',  first_name='Patrick', last_name='Habimana',   role='IT_ADMIN',        password='itadmin123'),
    ]
)

print('\nAccounts ready:')
print('  Kivu Noir   →  kivunoir / kivunoir123  (Manager)')
print('  Kivu Noir   →  admin    / admin1234    (IT Admin) — run create_admin.py')
print('  Kivu Noir   →  cashier  / cashier123')
print('  Kivu Noir   →  finance  / finance123')
print('  Kivu Noir   →  waiter   / waiter123')
print('  Repub Lounge→  manager  / manager123   (Manager)')
print('  Repub Lounge→  itadmin  / itadmin123   (IT Admin)')
