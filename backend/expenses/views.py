from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from .models import ExpenseCategory, ExpenseReport
from .serializers import ExpenseCategorySerializer, ExpenseReportSerializer
from core.permissions import ExpensePermission, TeamPermission
from audit.utils import log
from audit.models import AuditLog


class ExpenseCategoryListCreateView(generics.ListCreateAPIView):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [ExpensePermission]


class ExpenseCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [TeamPermission]


class ExpenseReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ExpenseReportSerializer
    permission_classes = [ExpensePermission]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'amount']
    ordering = ['-date']

    def get_queryset(self):
        qs = ExpenseReport.objects.filter(business=self.request.user.business)
        p = self.request.query_params
        if p.get('date_from'):  qs = qs.filter(date__gte=p['date_from'])
        if p.get('date_to'):    qs = qs.filter(date__lte=p['date_to'])
        if p.get('category'):   qs = qs.filter(category_id=p['category'])
        if p.get('search'):     qs = qs.filter(description__icontains=p['search'])
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(created_by=self.request.user, business=self.request.user.business)
        log(self.request, AuditLog.Action.CREATE, 'Expenses', obj.id, f'Expense {obj.category} — RWF {obj.amount} on {obj.date}')


class ExpenseReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseReportSerializer
    permission_classes = [ExpensePermission]

    def get_queryset(self):
        return ExpenseReport.objects.filter(business=self.request.user.business)

    def perform_update(self, serializer):
        obj = serializer.save()
        log(self.request, AuditLog.Action.UPDATE, 'Expenses', obj.id, f'Updated expense {obj.category} on {obj.date}')

    def perform_destroy(self, instance):
        log(self.request, AuditLog.Action.DELETE, 'Expenses', instance.id, f'Deleted expense {instance.category} on {instance.date}')
        instance.delete()
