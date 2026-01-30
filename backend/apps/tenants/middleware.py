"""
Tenant middleware for request-based tenant resolution.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Callable

from django.http import HttpRequest, HttpResponse

if TYPE_CHECKING:
    from apps.tenants.models import Tenant
    from apps.users.models import User


class TenantMiddleware:
    """
    Middleware to resolve and attach the current tenant to the request.

    Tenant resolution order:
    1. X-Tenant-ID header (for API clients)
    2. Subdomain (for web clients)
    3. User's default tenant (if authenticated)
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request.tenant = None  # type: ignore[attr-defined]

        # Skip tenant resolution for non-API paths and auth endpoints
        if not request.path.startswith("/api/") or request.path.startswith("/api/v1/auth/"):
            return self.get_response(request)

        # Skip for unauthenticated requests to public endpoints
        if request.path in ["/api/v1/health/", "/api/schema/", "/api/docs/"]:
            return self.get_response(request)

        tenant = self._resolve_tenant(request)

        if tenant is None and hasattr(request, "user") and request.user.is_authenticated:
            # Try to get user's default tenant
            tenant = self._get_user_default_tenant(request.user)  # type: ignore[arg-type]

        request.tenant = tenant  # type: ignore[attr-defined]
        return self.get_response(request)

    def _resolve_tenant(self, request: HttpRequest) -> Tenant | None:
        """Resolve tenant from request headers or subdomain."""
        from apps.tenants.models import Tenant

        # 1. Check X-Tenant-ID header
        tenant_id = request.headers.get("X-Tenant-ID")
        if tenant_id:
            try:
                return Tenant.objects.get(pk=tenant_id, is_active=True)
            except (Tenant.DoesNotExist, ValueError):
                pass

        # 2. Check subdomain
        host = request.get_host().split(":")[0]  # Remove port
        parts = host.split(".")
        if len(parts) > 2:
            subdomain = parts[0]
            try:
                return Tenant.objects.get(slug=subdomain, is_active=True)
            except Tenant.DoesNotExist:
                pass

        return None

    def _get_user_default_tenant(self, user: User) -> Tenant | None:
        """Get the user's default tenant."""
        membership = user.tenant_memberships.filter(is_default=True).first()
        if membership:
            return membership.tenant

        # Fall back to first active membership
        membership = user.tenant_memberships.filter(tenant__is_active=True).first()
        if membership:
            return membership.tenant

        return None
