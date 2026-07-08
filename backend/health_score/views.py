from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Avg

from .models import BusinessHealthScore
from .services import compute_score_for_date, compare_models_for_date
from audit.utils import log
from audit.models import AuditLog
from .serializers import BusinessHealthScoreSerializer
from core.permissions import DashboardPermission


class LatestScoreView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        score = BusinessHealthScore.objects.filter(
            business=request.user.business
        ).order_by('-date').first()
        if not score:
            return Response({'detail': 'No score computed yet.'}, status=404)
        return Response(BusinessHealthScoreSerializer(score).data)


class ScoreHistoryView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        since = date.today() - timedelta(days=days)
        scores = BusinessHealthScore.objects.filter(
            business=request.user.business, date__gte=since
        ).order_by('date')
        return Response(BusinessHealthScoreSerializer(scores, many=True).data)


class ComputeScoreView(APIView):
    permission_classes = [DashboardPermission]

    def post(self, request):
        target_date_str = request.data.get('date')
        try:
            target_date = (
                date.fromisoformat(target_date_str) if target_date_str else date.today()
            )
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

        try:
            score = compute_score_for_date(target_date, request.user.business)
        except RuntimeError as e:
            return Response({'detail': str(e)}, status=500)

        log(request, AuditLog.Action.COMPUTE, 'Dashboard', score.id, f'Computed health score for {target_date} — {score.score} ({score.label})')
        return Response(BusinessHealthScoreSerializer(score).data)


class ModelComparisonView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        target_date_str = request.query_params.get('date')
        try:
            target_date = date.fromisoformat(target_date_str) if target_date_str else date.today()
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)
        try:
            result = compare_models_for_date(target_date, request.user.business)
        except RuntimeError as e:
            return Response({'detail': str(e)}, status=500)
        return Response(result)


class ScoreSummaryView(APIView):
    permission_classes = [DashboardPermission]

    def get(self, request):
        latest = BusinessHealthScore.objects.filter(
            business=request.user.business
        ).order_by('-date').first()
        avg_30 = BusinessHealthScore.objects.filter(
            business=request.user.business,
            date__gte=date.today() - timedelta(days=30)
        ).aggregate(avg=Avg('score'))['avg']

        return Response({
            'latest_score': float(latest.score) if latest else None,
            'latest_label': latest.label if latest else None,
            'latest_trend': latest.trend if latest else None,
            'latest_date': str(latest.date) if latest else None,
            'avg_score_30d': round(float(avg_30), 2) if avg_30 else None,
            'recommendations': latest.recommendations if latest else [],
        })
