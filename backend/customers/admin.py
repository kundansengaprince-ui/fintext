from django.contrib import admin
from django.utils.html import format_html
from .models import CustomerRetentionRecord


@admin.register(CustomerRetentionRecord)
class CustomerRetentionRecordAdmin(admin.ModelAdmin):
    list_display = (
        'date', 'new_customers', 'returning_customers',
        'total_customers', 'retention_badge', 'created_by'
    )
    list_filter = ('date', 'created_by')
    search_fields = ('date', 'notes')
    ordering = ('-date',)
    date_hierarchy = 'date'
    readonly_fields = ('total_customers', 'retention_rate', 'created_at', 'updated_at')

    fieldsets = (
        ('Date', {'fields': ('date',)}),
        ('Customer Counts', {
            'fields': ('new_customers', 'returning_customers', 'total_customers', 'retention_rate')
        }),
        ('Notes', {'fields': ('notes',)}),
        ('Meta', {'fields': ('created_by', 'created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def retention_badge(self, obj):
        if obj.retention_rate is None:
            return '—'
        rate = float(obj.retention_rate)
        if rate >= 60:
            color = 'green'
        elif rate >= 40:
            color = 'orange'
        else:
            color = 'red'
        return format_html(
            '<span style="color:{}; font-weight:bold">{:.1f}%</span>', color, rate
        )
    retention_badge.short_description = 'Retention Rate'
    retention_badge.admin_order_field = 'retention_rate'

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
