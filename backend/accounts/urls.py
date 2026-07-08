from django.urls import path, include
from .views import (
    LoginView, LogoutView, MeView,
    TeamListView, TeamDetailView,
    RegisterView, CheckUsernameView,
    OAuthCallbackView,
    ForgotPasswordView, ResetPasswordView,
    ClientRequestView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('register/check-username/', CheckUsernameView.as_view(), name='check-username'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('team/', TeamListView.as_view(), name='team-list'),
    path('team/<int:pk>/', TeamDetailView.as_view(), name='team-detail'),
    path('oauth/callback/', OAuthCallbackView.as_view(), name='oauth-callback'),
    path('oauth/', include('allauth.socialaccount.urls')),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('contact/', ClientRequestView.as_view(), name='client-request'),
]
