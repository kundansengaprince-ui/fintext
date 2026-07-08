from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from accounts.models import Business, CustomUser
from conftest_helpers import make_business, make_user, auth_client


class BusinessModelTest(TestCase):
    def test_str(self):
        b = make_business('Kigali Cafe')
        self.assertIn('Kigali Cafe', str(b))

    def test_default_type(self):
        b = make_business()
        self.assertEqual(b.business_type, 'RESTAURANT')


class UserModelTest(TestCase):
    def setUp(self):
        self.biz = make_business()

    def test_role_properties(self):
        mgr = make_user(self.biz, 'MANAGER', 'mgr')
        self.assertTrue(mgr.is_manager)
        self.assertFalse(mgr.is_cashier)

    def test_str_includes_role(self):
        u = make_user(self.biz, 'CASHIER', 'cashier1')
        self.assertIn('Cashier', str(u))


class LoginViewTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'loginuser')
        self.url  = '/api/auth/login/'

    def test_valid_login_returns_token(self):
        r = self.client.post(self.url, {'username': 'loginuser', 'password': 'TestPass123!'}, content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('token', r.json())
        self.assertIn('user', r.json())
        self.assertIn('business', r.json())

    def test_wrong_password_returns_400(self):
        r = self.client.post(self.url, {'username': 'loginuser', 'password': 'wrong'}, content_type='application/json')
        self.assertEqual(r.status_code, 400)

    def test_unknown_user_returns_400(self):
        r = self.client.post(self.url, {'username': 'nobody', 'password': 'x'}, content_type='application/json')
        self.assertEqual(r.status_code, 400)


class LogoutViewTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'logoutuser')
        self.c    = auth_client(self.user)

    def test_logout_deletes_token(self):
        r = self.c.post('/api/auth/logout/')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_unauthenticated_logout_rejected(self):
        r = APIClient().post('/api/auth/logout/')
        self.assertEqual(r.status_code, 401)


class MeViewTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'meuser')
        self.c    = auth_client(self.user)

    def test_returns_current_user(self):
        r = self.c.get('/api/auth/me/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['username'], 'meuser')


class TeamViewTest(TestCase):
    def setUp(self):
        self.biz     = make_business()
        self.manager = make_user(self.biz, 'MANAGER',  'team_mgr')
        self.cashier = make_user(self.biz, 'CASHIER',  'team_cash')
        self.mgr_c   = auth_client(self.manager)
        self.cash_c  = auth_client(self.cashier)

    def test_manager_can_list_team(self):
        r = self.mgr_c.get('/api/auth/team/')
        self.assertEqual(r.status_code, 200)
        usernames = [u['username'] for u in r.json()]
        self.assertIn('team_mgr', usernames)
        self.assertIn('team_cash', usernames)

    def test_cashier_cannot_list_team(self):
        r = self.cash_c.get('/api/auth/team/')
        self.assertEqual(r.status_code, 403)

    def test_manager_can_create_team_member(self):
        r = self.mgr_c.post('/api/auth/team/', {
            'username': 'newstaff', 'first_name': 'New', 'last_name': 'Staff',
            'email': 'new@test.com', 'role': 'FLOOR_STAFF', 'password': 'TestPass123!',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertTrue(CustomUser.objects.filter(username='newstaff').exists())

    def test_manager_cannot_delete_self(self):
        r = self.mgr_c.delete(f'/api/auth/team/{self.manager.id}/')
        self.assertEqual(r.status_code, 400)

    def test_business_isolation(self):
        other_biz  = make_business('Other')
        other_user = make_user(other_biz, 'MANAGER', 'other_mgr')
        r = auth_client(other_user).get('/api/auth/team/')
        usernames = [u['username'] for u in r.json()]
        self.assertNotIn('team_mgr', usernames)


class CheckUsernameTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        make_user(self.biz, 'MANAGER', 'taken_user')

    def test_available_username(self):
        r = self.client.get('/api/auth/register/check-username/?username=brandnew')
        self.assertEqual(r.json()['available'], True)

    def test_taken_username(self):
        r = self.client.get('/api/auth/register/check-username/?username=taken_user')
        self.assertEqual(r.json()['available'], False)
        self.assertIn('suggestions', r.json())

    def test_reserved_username(self):
        r = self.client.get('/api/auth/register/check-username/?username=admin')
        self.assertEqual(r.json()['available'], False)
