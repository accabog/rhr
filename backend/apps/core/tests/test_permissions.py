"""
Tests for custom permission classes.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from apps.core.permissions import IsOwnerOrReadOnly, IsTenantAdmin, IsTenantMember

User = get_user_model()


class MockView:
    """Mock view for testing permissions."""

    pass


class MockRequest:
    """Mock request for testing permissions."""

    def __init__(self, user=None, tenant=None):
        self.user = user
        self.tenant = tenant
        self.method = "GET"


class MockObject:
    """Mock object for testing object-level permissions."""

    def __init__(self, user=None, owner=None, has_user=True, has_owner=True):
        if has_user:
            self.user = user
        if has_owner:
            self.owner = owner


@pytest.mark.django_db
class TestIsTenantMember:
    """Tests for IsTenantMember permission class."""

    def test_unauthenticated_user_denied(self):
        """Test unauthenticated users are denied."""
        permission = IsTenantMember()
        request = MockRequest()
        request.user = type("AnonymousUser", (), {"is_authenticated": False})()
        view = MockView()

        assert permission.has_permission(request, view) is False

    def test_user_without_tenant_denied(self, user):
        """Test user without tenant context is denied."""
        permission = IsTenantMember()
        request = MockRequest(user=user)
        view = MockView()

        assert permission.has_permission(request, view) is False

    def test_user_with_none_tenant_denied(self, user):
        """Test user with None tenant is denied."""
        permission = IsTenantMember()
        request = MockRequest(user=user, tenant=None)
        view = MockView()

        assert permission.has_permission(request, view) is False

    def test_user_member_of_tenant_allowed(self, user, tenant, tenant_membership):
        """Test user who is member of tenant is allowed."""
        permission = IsTenantMember()
        request = MockRequest(user=user, tenant=tenant)
        view = MockView()

        assert permission.has_permission(request, view) is True

    def test_user_not_member_of_tenant_denied(self, user, tenant2):
        """Test user who is not member of tenant is denied."""
        permission = IsTenantMember()
        request = MockRequest(user=user, tenant=tenant2)
        view = MockView()

        assert permission.has_permission(request, view) is False


@pytest.mark.django_db
class TestIsTenantAdmin:
    """Tests for IsTenantAdmin permission class."""

    def test_unauthenticated_user_denied(self):
        """Test unauthenticated users are denied."""
        permission = IsTenantAdmin()
        request = MockRequest()
        request.user = type("AnonymousUser", (), {"is_authenticated": False})()
        view = MockView()

        assert permission.has_permission(request, view) is False

    def test_user_without_tenant_denied(self, user):
        """Test user without tenant context is denied."""
        permission = IsTenantAdmin()
        request = MockRequest(user=user)
        view = MockView()

        assert permission.has_permission(request, view) is False

    def test_user_with_owner_role_allowed(self, user, tenant, tenant_membership):
        """Test user with owner role is allowed."""
        permission = IsTenantAdmin()
        request = MockRequest(user=user, tenant=tenant)
        view = MockView()

        # tenant_membership has role="owner" by default
        assert permission.has_permission(request, view) is True

    def test_user_with_admin_role_allowed(self, user, tenant):
        """Test user with admin role is allowed."""
        from apps.tenants.models import TenantMembership

        TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            role="admin",
        )

        permission = IsTenantAdmin()
        request = MockRequest(user=user, tenant=tenant)
        view = MockView()

        assert permission.has_permission(request, view) is True

    def test_user_with_member_role_denied(self, user, tenant):
        """Test user with member role is denied."""
        from apps.tenants.models import TenantMembership

        TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            role="member",
        )

        permission = IsTenantAdmin()
        request = MockRequest(user=user, tenant=tenant)
        view = MockView()

        assert permission.has_permission(request, view) is False

    def test_user_not_member_denied(self, user, tenant2):
        """Test user not member of tenant is denied."""
        permission = IsTenantAdmin()
        request = MockRequest(user=user, tenant=tenant2)
        view = MockView()

        assert permission.has_permission(request, view) is False


@pytest.mark.django_db
class TestIsOwnerOrReadOnly:
    """Tests for IsOwnerOrReadOnly permission class."""

    def test_safe_methods_allowed_for_any_user(self, user):
        """Test GET requests are allowed for any user."""
        permission = IsOwnerOrReadOnly()
        request = MockRequest(user=user)
        request.method = "GET"
        view = MockView()
        obj = MockObject(user=None)

        assert permission.has_object_permission(request, view, obj) is True

    def test_head_method_allowed(self, user):
        """Test HEAD requests are allowed."""
        permission = IsOwnerOrReadOnly()
        request = MockRequest(user=user)
        request.method = "HEAD"
        view = MockView()
        obj = MockObject()

        assert permission.has_object_permission(request, view, obj) is True

    def test_options_method_allowed(self, user):
        """Test OPTIONS requests are allowed."""
        permission = IsOwnerOrReadOnly()
        request = MockRequest(user=user)
        request.method = "OPTIONS"
        view = MockView()
        obj = MockObject()

        assert permission.has_object_permission(request, view, obj) is True

    def test_owner_can_modify_via_user_field(self, user):
        """Test owner can modify object with user field."""
        permission = IsOwnerOrReadOnly()
        request = MockRequest(user=user)
        request.method = "PUT"
        view = MockView()
        obj = MockObject(user=user)

        assert permission.has_object_permission(request, view, obj) is True

    def test_owner_can_modify_via_owner_field(self, user):
        """Test owner can modify object with owner field."""
        permission = IsOwnerOrReadOnly()
        request = MockRequest(user=user)
        request.method = "PATCH"
        view = MockView()
        # Object only has owner field, no user field
        obj = MockObject(owner=user, has_user=False)

        assert permission.has_object_permission(request, view, obj) is True

    def test_non_owner_cannot_modify_via_user_field(self, user, user2):
        """Test non-owner cannot modify object with user field."""
        permission = IsOwnerOrReadOnly()
        request = MockRequest(user=user)
        request.method = "DELETE"
        view = MockView()
        obj = MockObject(user=user2)

        assert permission.has_object_permission(request, view, obj) is False

    def test_non_owner_cannot_modify_via_owner_field(self, user, user2):
        """Test non-owner cannot modify object with owner field."""
        permission = IsOwnerOrReadOnly()
        request = MockRequest(user=user)
        request.method = "PUT"
        view = MockView()
        # Object only has owner field, no user field
        obj = MockObject(owner=user2, has_user=False)

        assert permission.has_object_permission(request, view, obj) is False

    def test_object_without_user_or_owner_field_denied(self, user):
        """Test objects without user/owner fields deny modification."""
        permission = IsOwnerOrReadOnly()
        request = MockRequest(user=user)
        request.method = "DELETE"
        view = MockView()

        class PlainObject:
            pass

        obj = PlainObject()

        assert permission.has_object_permission(request, view, obj) is False

    def test_owner_can_delete(self, user):
        """Test owner can delete object."""
        permission = IsOwnerOrReadOnly()
        request = MockRequest(user=user)
        request.method = "DELETE"
        view = MockView()
        obj = MockObject(user=user)

        assert permission.has_object_permission(request, view, obj) is True
