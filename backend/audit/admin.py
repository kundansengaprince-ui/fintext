from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'module', 'object_id', 'ip_address')
    list_filter = ('action', 'module')
    search_fields = ('user__username', 'detail', 'module')
    readonly_fields = ('user', 'action', 'module', 'object_id', 'detail', 'ip_address', 'timestamp')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
