from django.contrib import admin
from django.db.models import Sum
from .models import ExpenseCategory, ExpenseReport


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'total_expenses')
    search_fields = ('name',)

    def total_expenses(self, obj):
        total = obj.expenses.aggregate(total=Sum('amount'))['total'] or 0
        return f"RWF {total:,.0f}"
    total_expenses.short_description = 'All-Time Total'


class ExpenseReportInline(admin.TabularInline):
    model = ExpenseReport
    extra = 1
    fields = ('category', 'amount', 'description', 'receipt_reference')


@admin.register(ExpenseReport)
class ExpenseReportAdmin(admin.ModelAdmin):
    list_display = ('date', 'category', 'formatted_amount', 'description', 'receipt_reference', 'created_by')
    list_filter = ('category', 'date', 'created_by')
    search_fields = ('description', 'receipt_reference')
    ordering = ('-date',)
    date_hierarchy = 'date'
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Expense Details', {
            'fields': ('date', 'category', 'amount', 'description', 'receipt_reference')
        }),
        ('Meta', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def formatted_amount(self, obj):
        return f"RWF {obj.amount:,.0f}"
    formatted_amount.short_description = 'Amount'
    formatted_amount.admin_order_field = 'amount'

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
