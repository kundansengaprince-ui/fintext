from django.urls import path
from .views import MenuItemListCreateView, MenuItemDetailView, TransactionListCreateView, TransactionDetailView, MarkOrderServedView, TopItemsView, TeamShiftsView

urlpatterns = [
    path('menu/',                           MenuItemListCreateView.as_view(),  name='menu-list'),
    path('menu/<int:pk>/',                  MenuItemDetailView.as_view(),      name='menu-detail'),
    path('transactions/',                   TransactionListCreateView.as_view(), name='transaction-list'),
    path('transactions/<int:pk>/',          TransactionDetailView.as_view(),   name='transaction-detail'),
    path('transactions/<int:pk>/serve/',    MarkOrderServedView.as_view(),     name='transaction-serve'),
    path('top-items/',                      TopItemsView.as_view(),            name='top-items'),
    path('team-shifts/',                    TeamShiftsView.as_view(),          name='team-shifts'),
]
