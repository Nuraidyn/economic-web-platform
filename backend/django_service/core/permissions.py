from rest_framework.permissions import BasePermission


class RoleRequired(BasePermission):
    def __init__(self, *roles):
        self.roles = roles

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, "profile", None)
        if not profile:
            return False
        return profile.role in self.roles or request.user.is_staff
