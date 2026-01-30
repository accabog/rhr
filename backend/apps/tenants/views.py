"""
Tenant views.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsTenantAdmin, IsTenantMember

from .models import Tenant, TenantSettings
from .serializers import TenantSerializer, TenantSettingsSerializer


class TenantViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tenants."""

    serializer_class = TenantSerializer
    pagination_class = None  # Tenants list is small, no pagination needed

    def get_queryset(self):
        """Return tenants the user has access to."""
        return Tenant.objects.filter(
            memberships__user=self.request.user,
            is_active=True,
        ).distinct().order_by("id")

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsTenantAdmin()]
        # All other actions just need authentication - the queryset already
        # filters to tenants the user is a member of
        return [IsAuthenticated()]

    @action(detail=True, methods=["get", "patch"], url_path="settings", url_name="settings")
    def tenant_settings(self, request, pk=None):
        """Get or update tenant settings."""
        tenant = self.get_object()
        settings_obj, _ = TenantSettings.objects.get_or_create(tenant=tenant)

        if request.method == "PATCH":
            serializer = TenantSettingsSerializer(
                settings_obj, data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = TenantSettingsSerializer(settings_obj)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def current(self, request):
        """Get the current tenant from request context."""
        if not request.tenant:
            return Response(
                {"detail": "No tenant context"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(request.tenant)
        return Response(serializer.data)
