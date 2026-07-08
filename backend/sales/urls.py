from django.urls import path
from .views import SalesRecordListCreateView, SalesRecordDetailView

urlpatterns = [
    path('', SalesRecordListCreateView.as_view(), name='sales-list'),
    path('<int:pk>/', SalesRecordDetailView.as_view(), name='sales-detail'),
]
