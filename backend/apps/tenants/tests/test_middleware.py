"""
Tests for tenant middleware.
"""

import pytest
from django.test import RequestFactory, override_settings

from apps.tenants.middleware import TenantMiddleware
from apps.tenants.models import Tenant, TenantMembership


@pytest.mark.django_db
class TestTenantMiddleware:
    """Tests for TenantMiddleware."""

    @pytest.fixture
    def middleware(self):
        """Create middleware instance."""

        def get_response(request):
            return request

        return TenantMiddleware(get_response)

    @pytest.fixture
    def request_factory(self):
        """Create request factory."""
        return RequestFactory()

    def test_skips_non_api_paths(self, middleware, request_factory):
        """Test middleware skips non-API paths."""
        request = request_factory.get("/admin/")
        result = middleware(request)

        assert result.tenant is None

    def test_skips_auth_endpoints(self, middleware, request_factory):
        """Test middleware skips auth endpoints."""
        request = request_factory.get("/api/v1/auth/login/")
        result = middleware(request)

        assert result.tenant is None

    def test_skips_public_endpoints(self, middleware, request_factory):
        """Test middleware skips public endpoints."""
        public_paths = ["/api/v1/health/", "/api/schema/", "/api/docs/"]

        for path in public_paths:
            request = request_factory.get(path)
            result = middleware(request)
            assert result.tenant is None

    def test_resolves_tenant_from_header(self, middleware, request_factory, tenant):
        """Test tenant resolution from X-Tenant-ID header."""
        request = request_factory.get(
            "/api/v1/employees/",
            HTTP_X_TENANT_ID=str(tenant.id),
        )
        result = middleware(request)

        assert result.tenant == tenant

    def test_invalid_tenant_id_header(self, middleware, request_factory):
        """Test invalid tenant ID in header returns None."""
        request = request_factory.get(
            "/api/v1/employees/",
            HTTP_X_TENANT_ID="invalid",
        )
        result = middleware(request)

        assert result.tenant is None

    def test_nonexistent_tenant_id_header(self, middleware, request_factory):
        """Test nonexistent tenant ID in header returns None."""
        request = request_factory.get(
            "/api/v1/employees/",
            HTTP_X_TENANT_ID="99999",
        )
        result = middleware(request)

        assert result.tenant is None

    def test_inactive_tenant_not_resolved(self, middleware, request_factory, tenant):
        """Test inactive tenant is not resolved."""
        tenant.is_active = False
        tenant.save()

        request = request_factory.get(
            "/api/v1/employees/",
            HTTP_X_TENANT_ID=str(tenant.id),
        )
        result = middleware(request)

        assert result.tenant is None

    def test_resolves_tenant_from_subdomain(self, middleware, request_factory, tenant):
        """Test tenant resolution from subdomain."""
        request = request_factory.get(
            "/api/v1/employees/",
            HTTP_HOST="test-company.example.com",
        )
        result = middleware(request)

        assert result.tenant == tenant

    def test_subdomain_with_port(self, middleware, request_factory, tenant):
        """Test subdomain resolution ignores port."""
        request = request_factory.get(
            "/api/v1/employees/",
            HTTP_HOST="test-company.example.com:8000",
        )
        result = middleware(request)

        assert result.tenant == tenant

    def test_invalid_subdomain(self, middleware, request_factory):
        """Test invalid subdomain returns None."""
        request = request_factory.get(
            "/api/v1/employees/",
            HTTP_HOST="nonexistent.example.com",
        )
        result = middleware(request)

        assert result.tenant is None

    def test_header_takes_priority_over_subdomain(
        self, middleware, request_factory, tenant, tenant2
    ):
        """Test X-Tenant-ID header takes priority over subdomain."""
        request = request_factory.get(
            "/api/v1/employees/",
            HTTP_X_TENANT_ID=str(tenant.id),
            HTTP_HOST="other-company.example.com",  # Different subdomain
        )
        result = middleware(request)

        # Header should win
        assert result.tenant == tenant

    def test_falls_back_to_user_default_tenant(
        self, middleware, request_factory, user, tenant
    ):
        """Test falls back to user's default tenant when no header/subdomain."""
        from django.contrib.auth.models import AnonymousUser

        # Create membership with default=True
        TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            is_default=True,
        )

        request = request_factory.get("/api/v1/employees/")
        request.user = user

        result = middleware(request)

        assert result.tenant == tenant

    def test_user_first_active_membership_as_fallback(
        self, middleware, request_factory, user, tenant
    ):
        """Test falls back to user's first active membership."""
        # Create membership without default
        TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            is_default=False,
        )

        request = request_factory.get("/api/v1/employees/")
        request.user = user

        result = middleware(request)

        assert result.tenant == tenant

    def test_anonymous_user_no_fallback(self, middleware, request_factory, tenant):
        """Test anonymous user gets no tenant fallback."""
        from django.contrib.auth.models import AnonymousUser

        request = request_factory.get("/api/v1/employees/")
        request.user = AnonymousUser()

        result = middleware(request)

        # No tenant from header/subdomain, and anonymous can't have default
        assert result.tenant is None


@pytest.mark.django_db
class TestTenantResolutionPriority:
    """Tests for tenant resolution priority order."""

    @pytest.fixture
    def middleware(self):
        def get_response(request):
            return request

        return TenantMiddleware(get_response)

    @pytest.fixture
    def request_factory(self):
        return RequestFactory()

    def test_priority_header_over_subdomain_over_default(
        self, middleware, request_factory, user
    ):
        """Test resolution priority: header > subdomain > user default."""
        # Create 3 tenants
        header_tenant = Tenant.objects.create(
            name="Header Tenant", slug="header-tenant"
        )
        subdomain_tenant = Tenant.objects.create(
            name="Subdomain Tenant", slug="subdomain-tenant"
        )
        default_tenant = Tenant.objects.create(
            name="Default Tenant", slug="default-tenant"
        )

        # Set user default
        TenantMembership.objects.create(
            user=user,
            tenant=default_tenant,
            is_default=True,
        )

        # Request with all three resolution methods available
        request = request_factory.get(
            "/api/v1/employees/",
            HTTP_X_TENANT_ID=str(header_tenant.id),
            HTTP_HOST="subdomain-tenant.example.com",
        )
        request.user = user

        result = middleware(request)

        # Header should win
        assert result.tenant == header_tenant

    def test_priority_subdomain_over_default(
        self, middleware, request_factory, user
    ):
        """Test subdomain takes priority over user default."""
        subdomain_tenant = Tenant.objects.create(
            name="Subdomain Tenant", slug="subdomain-tenant"
        )
        default_tenant = Tenant.objects.create(
            name="Default Tenant", slug="default-tenant"
        )

        TenantMembership.objects.create(
            user=user,
            tenant=default_tenant,
            is_default=True,
        )

        request = request_factory.get(
            "/api/v1/employees/",
            HTTP_HOST="subdomain-tenant.example.com",
        )
        request.user = user

        result = middleware(request)

        # Subdomain should win
        assert result.tenant == subdomain_tenant
