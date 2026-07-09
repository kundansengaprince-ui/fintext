import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser

user, created = CustomUser.objects.get_or_create(
    username='admin',
    defaults={'email': 'admin@fintext.rw', 'is_staff': True, 'is_superuser': True}
)
user.is_staff = True
user.is_superuser = True
user.set_password('admin1234')
user.save()

if created:
    print('Superuser created: admin / admin1234')
else:
    print('Superuser updated: admin / admin1234')
