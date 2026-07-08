from django.urls import path
from .views import (
    InventoryItemListCreateView, InventoryItemDetailView,
    InventoryRecordListCreateView, InventoryRecordDetailView,
    LowStockAlertView,
)

urlpatterns = [
    path('items/', InventoryItemListCreateView.as_view(), name='inventory-item-list'),
    path('items/<int:pk>/', InventoryItemDetailView.as_view(), name='inventory-item-detail'),
    path('records/', InventoryRecordListCreateView.as_view(), name='inventory-record-list'),
    path('records/<int:pk>/', InventoryRecordDetailView.as_view(), name='inventory-record-detail'),
    path('low-stock/', LowStockAlertView.as_view(), name='inventory-low-stock'),
]
