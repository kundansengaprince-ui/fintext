from rest_framework.permissions import BasePermission
from .models import MitchHubUser

ADMIN_ROLES = {MitchHubUser.Role.CEO, MitchHubUser.Role.ADMIN, MitchHubUser.Role.DEVELOPER}


class MitchHubPermission(BasePermission):
    """Any authenticated Mitch Hub staff member."""
    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated) and
            isinstance(request.user, MitchHubUser)
        )


class MitchHubAdminPermission(BasePermission):
    """Only CEO, Admin, or Developer can manage the internal team."""
    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated) and
            isinstance(request.user, MitchHubUser) and
            request.user.role in ADMIN_ROLES
        )
