from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from core.permissions import TeamPermission
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogPagination(PageNumberPagination):
    page_size = 25


class AuditLogListView(APIView):
    permission_classes = [TeamPermission]

    def get(self, request):
        qs = AuditLog.objects.select_related('user').filter(business=request.user.business)

        module  = request.query_params.get('module')
        action  = request.query_params.get('action')
        user_id = request.query_params.get('user')
        search  = request.query_params.get('search', '').strip()

        if module:  qs = qs.filter(module__iexact=module)
        if action:  qs = qs.filter(action=action.upper())
        if user_id: qs = qs.filter(user_id=user_id)
        if search:  qs = qs.filter(detail__icontains=search) | qs.filter(user__username__icontains=search) | qs.filter(user__first_name__icontains=search)

        paginator = AuditLogPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(AuditLogSerializer(page, many=True).data)
