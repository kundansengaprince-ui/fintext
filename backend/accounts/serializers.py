from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser, Business
import random
import re


def _suggest_usernames(base):
    """Generate up to 5 available username suggestions based on the taken username."""
    base = re.sub(r'[^a-zA-Z0-9]', '', base).lower()[:20] or 'user'
    candidates = [
        f'{base}{random.randint(10, 99)}',
        f'{base}_{random.randint(10, 99)}',
        f'{base}.{random.randint(100, 999)}',
        f'the.{base}',
        f'{base}.official',
        f'{base}{random.randint(1000, 9999)}',
    ]
    available = [
        c for c in candidates
        if not CustomUser.objects.filter(username__iexact=c).exists()
    ]
    return available[:5]

ROLE_RESPONSIBILITIES = {
    'MANAGER':         'Full access — dashboard, all data entry, team management, score computation',
    'CASHIER':         'Sales entry — records daily transactions at the till',
    'FINANCE_OFFICER': 'Financial oversight — approves and logs all expense records',
    'IT_ADMIN':        'System management — manages staff accounts and system access',
    'FLOOR_STAFF':     'Customer tracking — records daily customer headcounts',
}


class UserSerializer(serializers.ModelSerializer):
    responsibilities = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            'id', 'username', 'first_name', 'last_name', 'email', 'role', 'phone', 'is_active',
            'responsibilities',
        )
        read_only_fields = ('id',)

    def get_responsibilities(self, obj):
        return ROLE_RESPONSIBILITIES.get(obj.role, '')


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    class Meta:
        model = CustomUser
        fields = ('username', 'first_name', 'last_name', 'email', 'role', 'phone', 'password')

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = ('first_name', 'last_name', 'email', 'role', 'phone', 'is_active', 'password')

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ('id', 'name', 'business_type', 'location')


class RegisterSerializer(serializers.Serializer):
    business_name = serializers.CharField(max_length=150, trim_whitespace=True)
    business_type = serializers.ChoiceField(choices=Business.Type.choices, default=Business.Type.RESTAURANT)
    first_name    = serializers.CharField(max_length=150, trim_whitespace=True)
    last_name     = serializers.CharField(max_length=150, required=False, allow_blank=True, trim_whitespace=True)
    username      = serializers.CharField(max_length=30, trim_whitespace=True)
    email         = serializers.EmailField()
    password      = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_username(self, value):
        import re
        RESERVED = {
            'admin', 'root', 'support', 'help', 'api', 'www', 'mail', 'login',
            'register', 'signup', 'dashboard', 'fintext', 'system', 'null', 'undefined',
        }
        errors = []
        if len(value) < 3:
            errors.append('at least 3 characters')
        if len(value) > 30:
            errors.append('30 characters or fewer')
        if not re.match(r'^[a-zA-Z0-9._]+$', value):
            errors.append('only letters, numbers, underscores (_) and periods (.) allowed')
        if value.startswith('.') or value.endswith('.'):
            errors.append('cannot start or end with a period')
        if '..' in value:
            errors.append('cannot contain consecutive periods')
        if value.lower() in RESERVED:
            errors.append('this username is reserved')
        if errors:
            raise serializers.ValidationError('Username must have ' + ', '.join(errors) + '.')
        if CustomUser.objects.filter(username__iexact=value).exists():
            suggestions = _suggest_usernames(value)
            raise serializers.ValidationError({
                'taken': True,
                'message': f'"{value}" is already taken.',
                'suggestions': suggestions,
            })
        return value
    def validate_email(self, value):
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate_business_name(self, value):
        import html
        return html.escape(value.strip())

    def validate_first_name(self, value):
        if not value.replace(' ', '').replace('-', '').isalpha():
            raise serializers.ValidationError('First name can only contain letters, spaces, and hyphens.')
        return value.strip()

    def create(self, validated_data):
        from django.db import transaction
        with transaction.atomic():
            business = Business.objects.create(
                name=validated_data['business_name'],
                business_type=validated_data.get('business_type', Business.Type.RESTAURANT),
            )
            user = CustomUser(
                username=validated_data['username'],
                first_name=validated_data['first_name'],
                last_name=validated_data.get('last_name', ''),
                email=validated_data['email'],
                role=CustomUser.Role.MANAGER,
                business=business,
            )
            user.set_password(validated_data['password'])
            user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        data['user'] = user
        return data
