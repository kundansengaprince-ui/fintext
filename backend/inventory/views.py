from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import InventoryItem, InventoryRecord
from .serializers import InventoryItemSerializer, InventoryRecordSerializer
from core.permissions import InventoryPermission
from audit.utils import log
from audit.models import AuditLog


class InventoryItemListCreateView(generics.ListCreateAPIView):
    serializer_class = InventoryItemSerializer
    permission_classes = [InventoryPermission]

    def get_queryset(self):
        return InventoryItem.objects.filter(business=self.request.user.business, is_active=True)

    def perform_create(self, serializer):
        obj = serializer.save(business=self.request.user.business)
        log(self.request, AuditLog.Action.CREATE, 'Inventory', obj.id, f'Created item: {obj.name}')


class InventoryItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InventoryItemSerializer
    permission_classes = [InventoryPermission]

    def get_queryset(self):
        return InventoryItem.objects.filter(business=self.request.user.business)

    def perform_update(self, serializer):
        obj = serializer.save()
        log(self.request, AuditLog.Action.UPDATE, 'Inventory', obj.id, f'Updated item: {obj.name}')


class LowStockAlertView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = InventoryItem.objects.filter(business=request.user.business, is_active=True)
        low = []
        for item in items:
            latest = InventoryRecord.objects.filter(
                business=request.user.business, item=item
            ).order_by('-date').first()
            if latest and latest.closing_quantity is not None:
                if float(latest.closing_quantity) <= float(item.reorder_level):
                    low.append({
                        'id': item.id,
                        'name': item.name,
                        'unit': item.unit,
                        'closing_quantity': float(latest.closing_quantity),
                        'reorder_level': float(item.reorder_level),
                        'date': str(latest.date),
                    })
        return Response(low)


class InventoryRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = InventoryRecordSerializer
    permission_classes = [InventoryPermission]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date']
    ordering = ['-date']

    def get_queryset(self):
        qs = InventoryRecord.objects.filter(business=self.request.user.business)
        p = self.request.query_params
        if p.get('date_from'): qs = qs.filter(date__gte=p['date_from'])
        if p.get('date_to'):   qs = qs.filter(date__lte=p['date_to'])
        if p.get('item'):      qs = qs.filter(item_id=p['item'])
        return qs

    def perform_create(self, serializer):
        from .models import InventoryRecord
        date = serializer.validated_data.get('date')
        item = serializer.validated_data.get('item')
        business = self.request.user.business
        defaults = {k: v for k, v in serializer.validated_data.items() if k not in ('date', 'item')}
        defaults['created_by'] = self.request.user
        obj, _ = InventoryRecord.objects.update_or_create(
            business=business, date=date, item=item, defaults=defaults
        )
        log(self.request, AuditLog.Action.CREATE, 'Inventory', obj.id, f'Inventory record {obj.item.name} on {obj.date}')
        serializer.instance = obj


class InventoryRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InventoryRecordSerializer
    permission_classes = [InventoryPermission]

    def get_queryset(self):
        return InventoryRecord.objects.filter(business=self.request.user.business)

    def perform_update(self, serializer):
        obj = serializer.save()
        log(self.request, AuditLog.Action.UPDATE, 'Inventory', obj.id, f'Updated inventory record {obj.item.name} on {obj.date}')

    def perform_destroy(self, instance):
        log(self.request, AuditLog.Action.DELETE, 'Inventory', instance.id, f'Deleted inventory record {instance.item.name} on {instance.date}')
        instance.delete()
