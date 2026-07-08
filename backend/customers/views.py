from rest_framework import generics, filters
from .models import CustomerRetentionRecord
from .serializers import CustomerRetentionSerializer
from core.permissions import CustomerPermission
from audit.utils import log
from audit.models import AuditLog


class CustomerRetentionListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerRetentionSerializer
    permission_classes = [CustomerPermission]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'retention_rate']
    ordering = ['-date']

    def get_queryset(self):
        qs = CustomerRetentionRecord.objects.filter(business=self.request.user.business)
        p = self.request.query_params
        if p.get('date_from'): qs = qs.filter(date__gte=p['date_from'])
        if p.get('date_to'):   qs = qs.filter(date__lte=p['date_to'])
        return qs

    def perform_create(self, serializer):
        from .models import CustomerRetentionRecord
        date = serializer.validated_data.get('date')
        business = self.request.user.business
        defaults = {k: v for k, v in serializer.validated_data.items() if k != 'date'}
        defaults['created_by'] = self.request.user
        obj, _ = CustomerRetentionRecord.objects.update_or_create(
            business=business, date=date, defaults=defaults
        )
        log(self.request, AuditLog.Action.CREATE, 'Customers', obj.id, f'Customer record for {obj.date} — {obj.total_customers} customers')
        serializer.instance = obj


class CustomerRetentionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerRetentionSerializer
    permission_classes = [CustomerPermission]

    def get_queryset(self):
        return CustomerRetentionRecord.objects.filter(business=self.request.user.business)

    def perform_update(self, serializer):
        obj = serializer.save()
        log(self.request, AuditLog.Action.UPDATE, 'Customers', obj.id, f'Updated customer record for {obj.date}')

    def perform_destroy(self, instance):
        log(self.request, AuditLog.Action.DELETE, 'Customers', instance.id, f'Deleted customer record for {instance.date}')
        instance.delete()
