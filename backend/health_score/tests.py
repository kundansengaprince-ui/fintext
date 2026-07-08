from django.test import TestCase
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch
from health_score.models import BusinessHealthScore
from conftest_helpers import make_business, make_user, auth_client

LATEST_URL  = '/api/health-score/latest/'
HISTORY_URL = '/api/health-score/history/'
COMPUTE_URL = '/api/health-score/compute/'


def make_score(business, d=None, score=72.5):
    return BusinessHealthScore.objects.create(
        business=business,
        date=d or date.today(),
        score=Decimal(str(score)),
        trend='STABLE',
        total_sales=500000,
        total_expenses=200000,
    )


class HealthScoreModelTest(TestCase):
    def setUp(self):
        self.biz = make_business()

    def test_label_excellent(self):
        s = make_score(self.biz, score=85)
        self.assertEqual(s.label, 'EXCELLENT')

    def test_label_good(self):
        s = make_score(self.biz, score=70)
        self.assertEqual(s.label, 'GOOD')

    def test_label_fair(self):
        s = make_score(self.biz, score=55)
        self.assertEqual(s.label, 'FAIR')

    def test_label_poor(self):
        s = make_score(self.biz, score=40)
        self.assertEqual(s.label, 'POOR')

    def test_label_critical(self):
        s = make_score(self.biz, score=20)
        self.assertEqual(s.label, 'CRITICAL')

    def test_str_contains_score(self):
        s = make_score(self.biz, score=72.5)
        self.assertIn('72.5', str(s))

    def test_unique_per_business_per_date(self):
        make_score(self.biz)
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            make_score(self.biz)


class HealthScoreAPIPermissionsTest(TestCase):
    def setUp(self):
        self.biz     = make_business()
        self.manager = make_user(self.biz, 'MANAGER',         'hs_mgr')
        self.finance = make_user(self.biz, 'FINANCE_OFFICER', 'hs_fin')
        self.cashier = make_user(self.biz, 'CASHIER',         'hs_cash')
        self.mgr_c   = auth_client(self.manager)
        self.fin_c   = auth_client(self.finance)
        self.cash_c  = auth_client(self.cashier)

    def test_manager_can_read_latest(self):
        make_score(self.biz)
        r = self.mgr_c.get(LATEST_URL)
        self.assertEqual(r.status_code, 200)

    def test_finance_can_read_latest(self):
        make_score(self.biz)
        r = self.fin_c.get(LATEST_URL)
        self.assertEqual(r.status_code, 200)

    def test_cashier_cannot_read_latest(self):
        r = self.cash_c.get(LATEST_URL)
        self.assertEqual(r.status_code, 403)

    def test_no_score_returns_404(self):
        r = self.mgr_c.get(LATEST_URL)
        self.assertEqual(r.status_code, 404)

    def test_cashier_cannot_compute(self):
        r = self.cash_c.post(COMPUTE_URL, {'date': str(date.today())}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_finance_cannot_compute(self):
        r = self.fin_c.post(COMPUTE_URL, {'date': str(date.today())}, format='json')
        self.assertEqual(r.status_code, 403)


class HealthScoreHistoryTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'hs_hist')
        self.c    = auth_client(self.user)

    def test_history_returns_scores_in_range(self):
        today = date.today()
        make_score(self.biz, d=today - timedelta(days=5), score=60)
        make_score(self.biz, d=today, score=75)
        r = self.c.get(HISTORY_URL, {'days': 30})
        self.assertEqual(r.status_code, 200)
        scores = [float(s['score']) for s in r.json()]
        self.assertIn(60.0, scores)
        self.assertIn(75.0, scores)

    def test_history_excludes_old_scores(self):
        today = date.today()
        make_score(self.biz, d=today - timedelta(days=60), score=40)
        make_score(self.biz, d=today, score=80)
        r = self.c.get(HISTORY_URL, {'days': 30})
        scores = [float(s['score']) for s in r.json()]
        self.assertNotIn(40.0, scores)
        self.assertIn(80.0, scores)

    def test_business_isolation(self):
        other_biz  = make_business('Other')
        make_score(other_biz, score=99)
        make_score(self.biz, score=55)
        r = self.c.get(HISTORY_URL)
        scores = [float(s['score']) for s in r.json()]
        self.assertIn(55.0, scores)
        self.assertNotIn(99.0, scores)


class ComputeScoreTest(TestCase):
    def setUp(self):
        self.biz  = make_business()
        self.user = make_user(self.biz, 'MANAGER', 'hs_compute')
        self.c    = auth_client(self.user)

    @patch('health_score.views.compute_score_for_date')
    def test_compute_creates_score(self, mock_compute):
        mock_compute.return_value = make_score(self.biz, score=68)
        r = self.c.post(COMPUTE_URL, {'date': str(date.today())}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('score', r.json())
        mock_compute.assert_called_once()

    @patch('health_score.views.compute_score_for_date')
    def test_compute_invalid_date_returns_400(self, mock_compute):
        r = self.c.post(COMPUTE_URL, {'date': 'not-a-date'}, format='json')
        self.assertEqual(r.status_code, 400)
        mock_compute.assert_not_called()
