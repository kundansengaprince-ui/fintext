"""
Shared test helpers for all apps.
"""
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from accounts.models import Business

User = get_user_model()


def make_business(name='Test Business'):
    return Business.objects.create(name=name, business_type='RESTAURANT')


def make_user(business, role='MANAGER', username=None, password='TestPass123!'):
    username = username or f'user_{role.lower()}_{business.id}'
    user = User.objects.create_user(
        username=username,
        password=password,
        business=business,
        role=role,
        email=f'{username}@test.com',
    )
    return user


def auth_client(user):
    token, _ = Token.objects.get_or_create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return client
