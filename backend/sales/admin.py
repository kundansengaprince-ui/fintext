from django.contrib import admin
from django.utils.html import format_html
from .models import SalesRecord


@admin.register(SalesRecord)
class SalesRecordAdmin(admin.ModelAdmin):
    list_display = (
        'date', 'formatted_total_sales', 'num_transactions',
        'formatted_avg', 'food_sales', 'beverage_sales', 'created_by'
    )
    list_filter = ('date', 'created_by')
    search_fields = ('date', 'notes')
    ordering = ('-date',)
    date_hierarchy = 'date'
    readonly_fields = ('avg_transaction_value', 'created_at', 'updated_at')

    fieldsets = (
        ('Date', {'fields': ('date',)}),
        ('Sales Figures (RWF)', {
            'fields': ('total_sales', 'food_sales', 'beverage_sales', 'num_transactions', 'avg_transaction_value')
        }),
        ('Notes', {'fields': ('notes',)}),
        ('Meta', {'fields': ('created_by', 'created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def formatted_total_sales(self, obj):
        return format_html('<strong>RWF {:,.0f}</strong>', obj.total_sales)
    formatted_total_sales.short_description = 'Total Sales'
    formatted_total_sales.admin_order_field = 'total_sales'

    def formatted_avg(self, obj):
        if obj.avg_transaction_value:
            return f"RWF {obj.avg_transaction_value:,.0f}"
        return '—'
    formatted_avg.short_description = 'Avg. Transaction'

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
