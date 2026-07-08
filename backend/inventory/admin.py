from django.contrib import admin
from django.utils.html import format_html
from .models import InventoryItem, InventoryRecord


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'unit', 'unit_cost', 'reorder_level', 'stock_status', 'is_active')
    list_filter = ('unit', 'is_active')
    search_fields = ('name',)
    list_editable = ('is_active',)

    def stock_status(self, obj):
        latest = obj.records.order_by('-date').first()
        if not latest:
            return format_html('<span style="color:gray">No records</span>')
        closing = latest.closing_quantity or 0
        if closing <= obj.reorder_level:
            return format_html(
                '<span style="color:red; font-weight:bold">LOW ({} {})</span>',
                closing, obj.unit
            )
        return format_html('<span style="color:green">{} {}</span>', closing, obj.unit)
    stock_status.short_description = 'Current Stock'


class InventoryRecordInline(admin.TabularInline):
    model = InventoryRecord
    extra = 0
    fields = ('date', 'opening_quantity', 'quantity_received', 'quantity_used', 'wastage', 'closing_quantity')
    readonly_fields = ('closing_quantity',)


@admin.register(InventoryRecord)
class InventoryRecordAdmin(admin.ModelAdmin):
    list_display = (
        'date', 'item', 'opening_quantity', 'quantity_received',
        'quantity_used', 'wastage', 'closing_quantity', 'created_by'
    )
    list_filter = ('item', 'date', 'created_by')
    search_fields = ('item__name',)
    ordering = ('-date',)
    date_hierarchy = 'date'
    readonly_fields = ('closing_quantity', 'created_at', 'updated_at')

    fieldsets = (
        ('Item & Date', {'fields': ('date', 'item')}),
        ('Quantities', {
            'fields': ('opening_quantity', 'quantity_received', 'quantity_used', 'wastage', 'closing_quantity')
        }),
        ('Notes', {'fields': ('notes',)}),
        ('Meta', {'fields': ('created_by', 'created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
