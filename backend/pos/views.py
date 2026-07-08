from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from .models import MenuItem, Transaction
from .serializers import MenuItemSerializer, TransactionSerializer
from core.permissions import SalesPermission, TeamPermission
from audit.utils import log
from audit.models import AuditLog


class MenuItemListCreateView(generics.ListCreateAPIView):
    serializer_class = MenuItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = MenuItem.objects.filter(business=self.request.user.business)
        if self.request.query_params.get('available_only'):
            qs = qs.filter(is_available=True)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(business=self.request.user.business)
        log(self.request, AuditLog.Action.CREATE, 'POS', obj.id, f'Menu item created: {obj.name}')


class MenuItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MenuItemSerializer
    permission_classes = [TeamPermission]

    def get_queryset(self):
        return MenuItem.objects.filter(business=self.request.user.business)

    def perform_update(self, serializer):
        obj = serializer.save()
        log(self.request, AuditLog.Action.UPDATE, 'POS', obj.id, f'Menu item updated: {obj.name}')


class TransactionListCreateView(generics.ListCreateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [SalesPermission]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Transaction.objects.filter(business=self.request.user.business).prefetch_related('items__menu_item')
        p = self.request.query_params
        if p.get('date'):      qs = qs.filter(date=p['date'])
        if p.get('date_from'): qs = qs.filter(date__gte=p['date_from'])
        if p.get('date_to'):   qs = qs.filter(date__lte=p['date_to'])
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(
            business=self.request.user.business,
            created_by=self.request.user,
        )
        log(self.request, AuditLog.Action.CREATE, 'POS', obj.id, f'Transaction #{obj.id} — RWF {obj.total}')


class TransactionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [SalesPermission]

    def get_queryset(self):
        return Transaction.objects.filter(business=self.request.user.business).prefetch_related('items__menu_item')

    def perform_update(self, serializer):
        obj = serializer.save()
        if obj.status == Transaction.Status.VOIDED:
            # Recalculate today's SalesRecord excluding voided transactions
            from sales.models import SalesRecord
            from django.db.models import Sum
            from decimal import Decimal
            completed = Transaction.objects.filter(
                business=obj.business,
                date=obj.date,
                status=Transaction.Status.COMPLETED,
            ).prefetch_related('items__menu_item')
            day_total = day_food = day_bev = Decimal('0')
            txn_count = 0
            for t in completed:
                txn_count += 1
                for ti in t.items.all():
                    day_total += ti.subtotal
                    if ti.menu_item.category == 'food':     day_food += ti.subtotal
                    elif ti.menu_item.category == 'beverage': day_bev += ti.subtotal
            SalesRecord.objects.filter(business=obj.business, date=obj.date).update(
                total_sales=day_total, food_sales=day_food,
                beverage_sales=day_bev, num_transactions=txn_count,
            )
            log(self.request, AuditLog.Action.UPDATE, 'POS', obj.id, f'Transaction #{obj.id} voided')
