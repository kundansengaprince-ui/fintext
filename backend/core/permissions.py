"""
Shared role-based permission classes for all apps.

Access matrix:
                   MANAGER  CASHIER  FINANCE  IT_ADMIN  FLOOR_STAFF
Dashboard            R+W      -       R         R          -
Sales                R+W     R+W      R         -          -
Expenses             R+W      -      R+W         -          -
Inventory            R+W      -       R          -          -
Customers            R+W      -       R          -         R+W
Compute Score         W       -       -          -          -
Team                 R+W      -       -         R+W         -
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS
from accounts.models import CustomUser

M  = CustomUser.Role.MANAGER
C  = CustomUser.Role.CASHIER
F  = CustomUser.Role.FINANCE_OFFICER
IT = CustomUser.Role.IT_ADMIN
FS = CustomUser.Role.FLOOR_STAFF


def _authenticated_with_role(user, roles):
    return bool(user and user.is_authenticated and user.business_id and user.role in roles)


class SalesPermission(BasePermission):
    """Manager + Cashier write; Manager + Cashier + Finance + IT read."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return _authenticated_with_role(request.user, [M, C, F, IT])
        return _authenticated_with_role(request.user, [M, C])


class ExpensePermission(BasePermission):
    """Manager + Finance write; Manager + Finance + IT read."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return _authenticated_with_role(request.user, [M, F, IT])
        return _authenticated_with_role(request.user, [M, F])


class InventoryPermission(BasePermission):
    """Manager write only; Manager + Finance + IT read."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return _authenticated_with_role(request.user, [M, F, IT])
        return _authenticated_with_role(request.user, [M])


class CustomerPermission(BasePermission):
    """Manager + Floor Staff write; Manager + Finance + Floor Staff + IT read."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return _authenticated_with_role(request.user, [M, F, FS, IT])
        return _authenticated_with_role(request.user, [M, FS])


class DashboardPermission(BasePermission):
    """Manager + Finance + IT read; Manager compute/write."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return _authenticated_with_role(request.user, [M, F, IT])
        return _authenticated_with_role(request.user, [M])


class TeamPermission(BasePermission):
    """Manager + IT Admin full access."""
    def has_permission(self, request, view):
        return _authenticated_with_role(request.user, [M, IT])
