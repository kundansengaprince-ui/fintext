from django.urls import path
from .views import (
    MitchHubLoginView, MitchHubLogoutView, MitchHubMeView,
    MitchHubDashboardView, MitchHubTeamListView, MitchHubTeamDetailView,
)

urlpatterns = [
    path('login/',        MitchHubLoginView.as_view()),
    path('logout/',       MitchHubLogoutView.as_view()),
    path('me/',           MitchHubMeView.as_view()),
    path('dashboard/',    MitchHubDashboardView.as_view()),
    path('dashboard/<int:pk>/', MitchHubDashboardView.as_view()),
    path('team/',         MitchHubTeamListView.as_view()),
    path('team/<int:pk>/', MitchHubTeamDetailView.as_view()),
]
