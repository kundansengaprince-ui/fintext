from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Business, ClientRequest


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ('name', 'business_type', 'location', 'email', 'is_active', 'created_at')
    list_filter = ('business_type', 'is_active')
    search_fields = ('name', 'email', 'location')


@admin.register(ClientRequest)
class ClientRequestAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'contact_name', 'email', 'business_type', 'status', 'created_at')
    list_filter = ('status', 'business_type')
    search_fields = ('business_name', 'contact_name', 'email')


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'get_full_name', 'email', 'role', 'business', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff', 'business')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('username',)
    autocomplete_fields = ['business']

    fieldsets = UserAdmin.fieldsets + (
        ('Role & Profile', {
            'fields': ('role', 'business', 'phone', 'profile_picture')
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role & Profile', {
            'fields': ('role', 'business', 'phone', 'first_name', 'last_name', 'email')
        }),
    )
