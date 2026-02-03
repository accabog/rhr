"""
Custom permissions for tenant-aware access control.
"""

from rest_framework import permissions


class IsTenantMember(permissions.BasePermission):
    """
    Allows access only to users who are members of the current tenant.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if not hasattr(request, "tenant") or request.tenant is None:
            return False
        return request.user.tenants.filter(pk=request.tenant.pk).exists()


class IsTenantAdmin(permissions.BasePermission):
    """
    Allows access only to users who are admins of the current tenant.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if not hasattr(request, "tenant") or request.tenant is None:
            return False
        membership = request.user.tenant_memberships.filter(tenant=request.tenant).first()
        return membership is not None and membership.role in ["admin", "owner"]


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners to edit an object.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Check if the object has a user/owner field
        if hasattr(obj, "user"):
            return obj.user == request.user
        if hasattr(obj, "owner"):
            return obj.owner == request.user
        return False
