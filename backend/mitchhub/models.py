from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
import secrets


class MitchHubUserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra):
        if not username:
            raise ValueError('Username is required.')
        user = self.model(username=username, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        return self.create_user(username, password, **extra)


class MitchHubUser(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        CEO             = 'CEO',             'CEO'
        CFO             = 'CFO',             'CFO'
        ACCOUNTANT      = 'ACCOUNTANT',      'Accountant'
        CASHIER         = 'CASHIER',         'Cashier'
        SUPPORT         = 'SUPPORT',         'Support Agent'
        MARKETING       = 'MARKETING',       'Marketing'
        DEVELOPER       = 'DEVELOPER',       'Developer'
        ADMIN           = 'ADMIN',           'Admin'

    username    = models.CharField(max_length=50, unique=True)
    first_name  = models.CharField(max_length=100, blank=True)
    last_name   = models.CharField(max_length=100, blank=True)
    email       = models.EmailField(blank=True)
    role        = models.CharField(max_length=20, choices=Role.choices, default=Role.SUPPORT)
    phone       = models.CharField(max_length=20, blank=True)
    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    groups = models.ManyToManyField(
        'auth.Group', blank=True, related_name='mitchhub_users'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission', blank=True, related_name='mitchhub_users'
    )

    objects = MitchHubUserManager()

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = 'Mitch Hub User'

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'


class MitchHubToken(models.Model):
    user       = models.OneToOneField(MitchHubUser, on_delete=models.CASCADE, related_name='mh_token')
    key        = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def get_or_create(cls, user):
        try:
            return cls.objects.get(user=user)
        except cls.DoesNotExist:
            return cls.objects.create(user=user, key=secrets.token_hex(32))

    def __str__(self):
        return f'Token for {self.user.username}'
