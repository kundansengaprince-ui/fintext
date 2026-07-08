from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit

from django.db.models import Count
from .models import CustomUser, Business, ClientRequest
from .serializers import LoginSerializer, UserSerializer, UserCreateSerializer, UserUpdateSerializer, RegisterSerializer, BusinessSerializer
from .serializers import _suggest_usernames
from core.permissions import TeamPermission
from audit.utils import log
from audit.models import AuditLog


def _annotated_users(business):
    return CustomUser.objects.filter(business=business).order_by('first_name', 'last_name', 'username')


@method_decorator(never_cache, name='dispatch')
@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='post')
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        log(request, AuditLog.Action.LOGIN, 'Auth', user.id, f'{user.username} logged in')
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
            'business': BusinessSerializer(user.business).data if user.business else None,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        log(request, AuditLog.Action.LOGOUT, 'Auth', request.user.id, f'{request.user.username} logged out')
        request.user.auth_token.delete()
        return Response({'detail': 'Logged out successfully.'})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class TeamListView(APIView):
    permission_classes = [TeamPermission]

    def get(self, request):
        users = _annotated_users(request.user.business)
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save(business=request.user.business)
        log(request, AuditLog.Action.CREATE, 'Team', user.id, f'Created user {user.username} ({user.role})')
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class TeamDetailView(APIView):
    permission_classes = [TeamPermission]

    def get(self, request, pk):
        user = get_object_or_404(_annotated_users(request.user.business), pk=pk)
        return Response(UserSerializer(user).data)

    def patch(self, request, pk):
        user = get_object_or_404(CustomUser, pk=pk)
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log(request, AuditLog.Action.UPDATE, 'Team', user.id, f'Updated user {user.username}')
        return Response(UserSerializer(user).data)

    def delete(self, request, pk):
        user = get_object_or_404(CustomUser, pk=pk)
        if user == request.user:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        log(request, AuditLog.Action.DELETE, 'Team', pk, f'Deleted user {user.username}')
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(never_cache, name='dispatch')
class RegisterView(APIView):
    """Disabled — businesses are onboarded manually by Fintext admins."""
    permission_classes = [AllowAny]

    def post(self, request):
        return Response(
            {'detail': 'Self-registration is not available. Please contact Fintext to get your business onboarded.'},
            status=status.HTTP_403_FORBIDDEN,
        )


class CheckUsernameView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        import re
        RESERVED = {
            'admin', 'root', 'support', 'help', 'api', 'www', 'mail', 'login',
            'register', 'signup', 'dashboard', 'fintext', 'system', 'null', 'undefined',
        }
        value = request.query_params.get('username', '').strip()
        if not value:
            return Response({'available': False, 'error': 'No username provided.'})

        if len(value) > 30:
            return Response({'available': False, 'error': 'Maximum 30 characters.'})
        if not re.match(r'^[a-zA-Z0-9._]+$', value):
            return Response({'available': False, 'error': 'Only letters, numbers, . and _ allowed.'})
        if value.startswith('.') or value.endswith('.'):
            return Response({'available': False, 'error': 'Cannot start or end with a period.'})
        if '..' in value:
            return Response({'available': False, 'error': 'Cannot contain consecutive periods.'})
        if value.lower() in RESERVED:
            return Response({'available': False, 'error': 'This username is reserved.'})

        taken = CustomUser.objects.filter(username__iexact=value).exists()
        if taken:
            return Response({
                'available': False,
                'error': f'"{value}" is already taken.',
                'suggestions': _suggest_usernames(value),
            })
        return Response({'available': True})


class OAuthCallbackView(APIView):
    """
    POST { provider: 'google'|'apple', access_token: '...' }
    Returns our app token + user + business — same shape as LoginView.
    If it's a brand-new social account, creates a Business automatically.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
        from allauth.socialaccount.providers.apple.views import AppleOAuth2Adapter
        from allauth.socialaccount.models import SocialLogin, SocialToken, SocialApp
        from allauth.socialaccount.helpers import complete_social_login
        from django.test import RequestFactory

        provider = request.data.get('provider', '').lower()
        access_token = request.data.get('access_token', '').strip()

        if provider not in ('google', 'apple'):
            return Response({'detail': 'Unsupported provider.'}, status=status.HTTP_400_BAD_REQUEST)
        if not access_token:
            return Response({'detail': 'access_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            AdapterClass = GoogleOAuth2Adapter if provider == 'google' else AppleOAuth2Adapter
            adapter = AdapterClass(request)
            app = SocialApp.objects.get(provider=provider)
            token = SocialToken(app=app, token=access_token)
            login = adapter.complete_login(request, app, token, response={'access_token': access_token})
            login.token = token
            login.state = SocialLogin.state_from_request(request)
            complete_social_login(request, login)
        except Exception as e:
            return Response({'detail': f'OAuth failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        user = login.account.user
        if not user.pk:
            return Response({'detail': 'Could not authenticate with provider.'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-create a business for brand-new social users
        if not user.business:
            from .models import Business
            name = user.get_full_name() or user.username or user.email.split('@')[0]
            business = Business.objects.create(name=f"{name}'s Business")
            user.business = business
            user.role = CustomUser.Role.MANAGER
            user.save(update_fields=['business', 'role'])

        token_obj, _ = Token.objects.get_or_create(user=user)
        log(request, AuditLog.Action.LOGIN, 'Auth', user.id, f'{user.username} logged in via {provider}')
        return Response({
            'token': token_obj.key,
            'user': UserSerializer(user).data,
            'business': BusinessSerializer(user.business).data,
        })


@method_decorator(ratelimit(key='ip', rate='5/h', method='POST', block=True), name='post')
class ForgotPasswordView(APIView):
    """
    POST { email } — sends a reset link if the email exists.
    Always returns 200 so we don't leak whether an email is registered.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import send_mail
        from django.conf import settings

        email = request.data.get('email', '').strip().lower()
        if email:
            try:
                user = CustomUser.objects.get(email__iexact=email, is_active=True)
                uid   = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
                send_mail(
                    subject='Reset your password — Business Health Dashboard',
                    message=(
                        f"Hi {user.first_name or user.username},\n\n"
                        f"Click the link below to reset your password. "
                        f"This link expires in 1 hour.\n\n"
                        f"{reset_url}\n\n"
                        f"If you didn't request this, ignore this email."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except CustomUser.DoesNotExist:
                pass  # silent — don't reveal if email exists

        return Response({'detail': 'If that email is registered, a reset link has been sent.'})


class ResetPasswordView(APIView):
    """
    POST { uid, token, password } — validates token and sets new password.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        uid      = request.data.get('uid', '')
        token    = request.data.get('token', '')
        password = request.data.get('password', '')

        if not all([uid, token, password]):
            return Response({'detail': 'uid, token and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pk   = force_str(urlsafe_base64_decode(uid))
            user = CustomUser.objects.get(pk=pk, is_active=True)
        except (CustomUser.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'This reset link has expired or already been used.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password, user)
        except DjangoValidationError as e:
            return Response({'detail': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=['password'])
        # Invalidate all existing tokens so old sessions can't be reused
        Token.objects.filter(user=user).delete()
        log(request, AuditLog.Action.UPDATE, 'Auth', user.id, f'{user.username} reset their password')
        return Response({'detail': 'Password reset successfully. Please sign in.'})


@method_decorator(ratelimit(key='ip', rate='10/h', method='POST', block=True), name='post')
class ClientRequestView(APIView):
    """Public endpoint — businesses submit their info to get onboarded."""
    permission_classes = [AllowAny]

    def post(self, request):
        required = ['business_name', 'business_type', 'contact_name', 'email']
        for field in required:
            if not request.data.get(field, '').strip():
                return Response({'detail': f'{field} is required.'}, status=status.HTTP_400_BAD_REQUEST)

        ClientRequest.objects.create(
            business_name=request.data['business_name'].strip(),
            business_type=request.data['business_type'].strip(),
            contact_name=request.data['contact_name'].strip(),
            email=request.data['email'].strip().lower(),
            phone=request.data.get('phone', '').strip(),
            location=request.data.get('location', '').strip(),
            message=request.data.get('message', '').strip(),
        )
        return Response({'detail': 'Request received. We will get back to you shortly.'}, status=status.HTTP_201_CREATED)


