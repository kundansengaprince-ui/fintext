from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import MitchHubToken


class MitchHubTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('MHToken '):
            return None
        key = auth.split(' ', 1)[1].strip()
        try:
            token = MitchHubToken.objects.select_related('user').get(key=key)
        except MitchHubToken.DoesNotExist:
            raise AuthenticationFailed('Invalid token.')
        if not token.user.is_active:
            raise AuthenticationFailed('User inactive.')
        return (token.user, token)
