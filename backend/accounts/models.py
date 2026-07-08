from django.contrib.auth.models import AbstractUser
from django.db import models


class Business(models.Model):
    class Type(models.TextChoices):
        RESTAURANT = 'RESTAURANT', 'Restaurant'
        BAR        = 'BAR',        'Bar'
        CAFE       = 'CAFE',       'Café'

    name          = models.CharField(max_length=150)
    business_type = models.CharField(max_length=20, choices=Type.choices, default=Type.RESTAURANT)
    location      = models.CharField(max_length=200, blank=True)
    phone         = models.CharField(max_length=20, blank=True)
    email         = models.EmailField(blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Business'
        verbose_name_plural = 'Businesses'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_business_type_display()})"


class ClientRequest(models.Model):
    class Status(models.TextChoices):
        PENDING   = 'PENDING',   'Pending'
        REVIEWED  = 'REVIEWED',  'Reviewed'
        ONBOARDED = 'ONBOARDED', 'Onboarded'
        REJECTED  = 'REJECTED',  'Rejected'

    business_name = models.CharField(max_length=150)
    business_type = models.CharField(max_length=20, choices=Business.Type.choices)
    contact_name  = models.CharField(max_length=150)
    email         = models.EmailField()
    phone         = models.CharField(max_length=20, blank=True)
    location      = models.CharField(max_length=200, blank=True)
    message       = models.TextField(blank=True)
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.business_name} — {self.contact_name} ({self.status})"


class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        MANAGER        = 'MANAGER',        'Manager / Owner'
        CASHIER        = 'CASHIER',        'Cashier'
        FINANCE_OFFICER = 'FINANCE_OFFICER', 'Finance Officer'
        IT_ADMIN       = 'IT_ADMIN',       'IT Admin'
        FLOOR_STAFF    = 'FLOOR_STAFF',    'Waiter / Floor Staff'

    business = models.ForeignKey(
        Business, on_delete=models.CASCADE,
        null=True, blank=True, related_name='users'
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.FLOOR_STAFF)
    phone = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_manager(self):
        return self.role == self.Role.MANAGER

    @property
    def is_finance_officer(self):
        return self.role == self.Role.FINANCE_OFFICER

    @property
    def is_it_admin(self):
        return self.role == self.Role.IT_ADMIN

    @property
    def is_cashier(self):
        return self.role == self.Role.CASHIER
