from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

# Custom admin branding
admin.site.site_header = 'Business Health Dashboard'
admin.site.site_title = 'BHD Admin'
admin.site.index_title = 'Dashboard Management'

urlpatterns = [
    path('api/health/', lambda r: JsonResponse({'status': 'ok'})),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/expenses/', include('expenses.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/customers/', include('customers.urls')),
    path('api/health-score/', include('health_score.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/mitchhub/', include('mitchhub.urls')),
    path('api/pos/', include('pos.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
