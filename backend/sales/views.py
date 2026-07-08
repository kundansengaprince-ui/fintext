from rest_framework import generics, filters
from .models import SalesRecord
from .serializers import SalesRecordSerializer
from core.permissions import SalesPermission
from audit.utils import log
from audit.models import AuditLog


class SalesRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = SalesRecordSerializer
    permission_classes = [SalesPermission]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'total_sales']
    ordering = ['-date']

    def get_queryset(self):
        qs = SalesRecord.objects.filter(business=self.request.user.business)
        p = self.request.query_params
        if p.get('date_from'): qs = qs.filter(date__gte=p['date_from'])
        if p.get('date_to'):   qs = qs.filter(date__lte=p['date_to'])
        return qs

    def perform_create(self, serializer):
        from .models import SalesRecord
        date = serializer.validated_data.get('date')
        business = self.request.user.business
        defaults = {k: v for k, v in serializer.validated_data.items() if k != 'date'}
        defaults['created_by'] = self.request.user
        obj, _ = SalesRecord.objects.update_or_create(
            business=business, date=date, defaults=defaults
        )
        log(self.request, AuditLog.Action.CREATE, 'Sales', obj.id, f'Sales record for {obj.date} — RWF {obj.total_sales}')
        serializer.instance = obj


class SalesRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SalesRecordSerializer
    permission_classes = [SalesPermission]

    def get_queryset(self):
        return SalesRecord.objects.filter(business=self.request.user.business)

    def perform_update(self, serializer):
        obj = serializer.save()
        log(self.request, AuditLog.Action.UPDATE, 'Sales', obj.id, f'Updated sales record for {obj.date}')

    def perform_destroy(self, instance):
        log(self.request, AuditLog.Action.DELETE, 'Sales', instance.id, f'Deleted sales record for {instance.date}')
        instance.delete()
