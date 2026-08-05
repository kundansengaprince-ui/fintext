from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import MenuItem, Transaction, TransactionItem
from .serializers import MenuItemSerializer, TransactionSerializer, _deduct_inventory_for_transaction, _update_sales_record
from core.permissions import SalesPermission, TeamPermission, ServeOrderPermission
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
        # Floor Staff are unconditionally scoped to their own transactions only.
        # This is enforced server-side regardless of any query param the client sends.
        if self.request.user.role == 'FLOOR_STAFF':
            return qs.filter(created_by=self.request.user)
        p = self.request.query_params
        if p.get('date'):      qs = qs.filter(date=p['date'])
        if p.get('date_from'): qs = qs.filter(date__gte=p['date_from'])
        if p.get('date_to'):   qs = qs.filter(date__lte=p['date_to'])
        if p.get('status'):    qs = qs.filter(status=p['status'])
        # 'me' is the only accepted value - resolved server-side to prevent ID spoofing
        if p.get('created_by') == 'me':
            qs = qs.filter(created_by=self.request.user)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(
            business=self.request.user.business,
            created_by=self.request.user,
        )
        log(self.request, AuditLog.Action.CREATE, 'POS', obj.id, f'Transaction #{obj.id} - RWF {obj.total}')


class TransactionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [SalesPermission]

    def get_queryset(self):
        qs = Transaction.objects.filter(business=self.request.user.business).prefetch_related('items__menu_item')
        # Floor Staff may only fetch their own transactions by ID.
        # An attempt to fetch another user's transaction returns 404, not 403.
        if self.request.user.role == 'FLOOR_STAFF':
            qs = qs.filter(created_by=self.request.user)
        return qs

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


class MarkOrderServedView(APIView):
    """
    POST /api/pos/transactions/<pk>/serve/

    Marks an order as served. This is the moment stock is deducted.

    Access rules (ServeOrderPermission):
      - Manager / Cashier: can serve any order for their business
      - Floor Staff: can only serve orders they created (created_by == request.user)

    Guards:
      - Voided orders cannot be served (400)
      - Already-served orders cannot be served again - no double-deduction (400)
      - served_at and status are set server-side; not settable by the client
    """
    permission_classes = [ServeOrderPermission]

    def get_object(self):
        txn = get_object_or_404(
            Transaction.objects.filter(business=self.request.user.business),
            pk=self.kwargs['pk'],
        )
        self.check_object_permissions(self.request, txn)
        return txn

    def post(self, request, pk):
        txn = self.get_object()

        if txn.status == Transaction.Status.VOIDED:
            return Response(
                {'detail': 'Voided orders cannot be marked as served.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        if txn.served_at is not None:
            return Response(
                {'detail': 'Order has already been marked as served.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        # Deduct stock for all items in the order
        _deduct_inventory_for_transaction(txn)

        # Set status + timestamp atomically
        txn.served_at = timezone.now()
        txn.status    = Transaction.Status.COMPLETED
        txn.save(update_fields=['served_at', 'status'])

        # Update today's SalesRecord - order is now COMPLETED so it counts toward daily totals
        _update_sales_record(txn)

        log(request, AuditLog.Action.UPDATE, 'POS', txn.id,
            f'Transaction #{txn.id} marked as served by {request.user}')

        return Response(TransactionSerializer(txn).data, status=http_status.HTTP_200_OK)


class TopItemsView(APIView):
    """
    GET /api/pos/top-items/?date=YYYY-MM-DD

    Returns the top 10 menu items by quantity sold for the given date
    (defaults to today) across the whole business.
    Response: [{name, quantity}] - no price or revenue data exposed.
    Permission: SalesPermission read path (Manager, Cashier, Finance, IT, Floor Staff).
    """
    permission_classes = [SalesPermission]

    def get(self, request):
        from datetime import date as date_type
        target = request.query_params.get('date', str(date_type.today()))
        rows = (
            TransactionItem.objects
            .filter(
                transaction__business=request.user.business,
                transaction__date=target,
                transaction__status=Transaction.Status.COMPLETED,
            )
            .values('menu_item__name')
            .annotate(quantity=Sum('quantity'))
            .order_by('-quantity')[:10]
        )
        return Response([
            {'name': r['menu_item__name'], 'quantity': r['quantity']}
            for r in rows
        ])
