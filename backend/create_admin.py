import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser

if not CustomUser.objects.filter(username='admin').exists():
    CustomUser.objects.create_superuser(
        username='admin',
        email='admin@fintext.rw',
        password='admin1234',
    )
    print('Superuser created: admin / admin1234')
    print('Use Django admin to manage businesses and onboard clients.')
else:
    print('Superuser already exists.')
