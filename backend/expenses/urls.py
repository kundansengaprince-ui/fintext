from django.urls import path
from .views import (
    ExpenseCategoryListCreateView, ExpenseCategoryDetailView,
    ExpenseReportListCreateView, ExpenseReportDetailView,
)

urlpatterns = [
    path('categories/', ExpenseCategoryListCreateView.as_view(), name='expense-category-list'),
    path('categories/<int:pk>/', ExpenseCategoryDetailView.as_view(), name='expense-category-detail'),
    path('', ExpenseReportListCreateView.as_view(), name='expense-list'),
    path('<int:pk>/', ExpenseReportDetailView.as_view(), name='expense-detail'),
]
