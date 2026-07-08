from django.urls import path
from .views import CustomerRetentionListCreateView, CustomerRetentionDetailView

urlpatterns = [
    path('', CustomerRetentionListCreateView.as_view(), name='retention-list'),
    path('<int:pk>/', CustomerRetentionDetailView.as_view(), name='retention-detail'),
]
