from django.urls import path
from .views import (
    ReportMetaView, SalesReportView, ExpensesReportView,
    InventoryReportView, CustomersReportView, HealthScoreReportView, FullReportView,
)

urlpatterns = [
    path('',               ReportMetaView.as_view(),       name='report-meta'),
    path('sales/',         SalesReportView.as_view(),       name='report-sales'),
    path('expenses/',      ExpensesReportView.as_view(),    name='report-expenses'),
    path('inventory/',     InventoryReportView.as_view(),   name='report-inventory'),
    path('customers/',     CustomersReportView.as_view(),   name='report-customers'),
    path('health-scores/', HealthScoreReportView.as_view(), name='report-health-scores'),
    path('full/',          FullReportView.as_view(),        name='report-full'),
]
