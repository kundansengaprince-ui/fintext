from django.urls import path
from .views import LatestScoreView, ScoreHistoryView, ComputeScoreView, ScoreSummaryView, ModelComparisonView

urlpatterns = [
    path('latest/', LatestScoreView.as_view(), name='score-latest'),
    path('history/', ScoreHistoryView.as_view(), name='score-history'),
    path('compute/', ComputeScoreView.as_view(), name='score-compute'),
    path('summary/', ScoreSummaryView.as_view(), name='score-summary'),
    path('compare/', ModelComparisonView.as_view(), name='score-compare'),
]
