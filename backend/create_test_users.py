"""
Seeds one demo business with a full team for development/testing.
This simulates a real onboarded client — run once after migrations.
Run: python create_test_users.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser, Business

business, created = Business.objects.get_or_create(
    name='Repub Lounge',
    defaults={
        'business_type': 'RESTAURANT',
        'location': 'Kimihurura, Kigali',
        'email': 'info@republounge.rw',
        'phone': '+250 788 000 000',
    }
)
if created:
    print(f'Created demo business: {business.name}')
else:
    print(f'Demo business already exists: {business.name}')

users = [
    dict(username='manager',  first_name='Jean',    last_name='Claude',     role='MANAGER',         password='manager123'),
    dict(username='cashier',  first_name='Alice',   last_name='Uwase',      role='CASHIER',         password='cashier123'),
    dict(username='finance',  first_name='Robert',  last_name='Nkurunziza', role='FINANCE_OFFICER', password='finance123'),
    dict(username='itadmin',  first_name='Patrick', last_name='Habimana',   role='IT_ADMIN',        password='itadmin123'),
    dict(username='waiter',   first_name='Grace',   last_name='Mutesi',     role='FLOOR_STAFF',     password='waiter123'),
]

for u in users:
    pw = u.pop('password')
    obj, created = CustomUser.objects.get_or_create(
        username=u['username'],
        defaults={**u, 'business': business}
    )
    if created:
        obj.set_password(pw)
        obj.save()
        print(f"  Created  {obj.username:10s}  ({obj.role})")
    elif not obj.business:
        obj.business = business
        obj.save(update_fields=['business'])
        print(f"  Fixed    {obj.username:10s}  (assigned to {business.name})")
    else:
        print(f"  Exists   {obj.username:10s}  ({obj.role})")

print(f'\nDemo accounts ready (business: {business.name}):')
print('  manager  / manager123  — full access')
print('  cashier  / cashier123  — sales only')
print('  finance  / finance123  — expenses + read-only')
print('  itadmin  / itadmin123  — team management')
print('  waiter   / waiter123   — customers only')
