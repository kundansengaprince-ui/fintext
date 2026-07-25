import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser, Business

# Ensure Kivu Noir exists
business, _ = Business.objects.get_or_create(
    name='Kivu Noir',
    defaults={
        'business_type': 'CAFE',
        'location': 'Kigali, Rwanda',
        'email': 'info@kivunoir.rw',
        'phone': '+250 788 111 111',
    }
)

user, created = CustomUser.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@fintext.rw',
        'is_staff': True,
        'is_superuser': True,
        'role': 'IT_ADMIN',
        'business': business,
    }
)
user.is_staff = True
user.is_superuser = True
user.role = 'IT_ADMIN'
user.business = business
user.set_password('admin1234')
user.save()

if created:
    print(f'Created: admin / admin1234  (IT_ADMIN @ {business.name})')
else:
    print(f'Updated: admin / admin1234  (IT_ADMIN @ {business.name})')
