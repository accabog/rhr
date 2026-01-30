"""
Tests for tenants views.
"""

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from apps.tenants.models import Tenant, TenantMembership, TenantSettings


@pytest.mark.django_db
class TestTenantViewSet:
    """Tests for Tenant API endpoints."""

    def test_list_tenants_returns_user_tenants(
        self, authenticated_client, user, tenant, tenant2
    ):
        """Test listing tenants returns only user's tenants."""
        # User is member of tenant only
        TenantMembership.objects.create(user=user, tenant=tenant)

        url = reverse("tenant-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        tenant_ids = [t["id"] for t in response.data]
        assert tenant.id in tenant_ids
        assert tenant2.id not in tenant_ids

    def test_list_tenants_excludes_inactive(
        self, authenticated_client, user, tenant
    ):
        """Test inactive tenants are not listed."""
        TenantMembership.objects.create(user=user, tenant=tenant)
        tenant.is_active = False
        tenant.save()

        url = reverse("tenant-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_retrieve_tenant(
        self, authenticated_client, user, tenant
    ):
        """Test retrieving a tenant."""
        TenantMembership.objects.create(user=user, tenant=tenant)

        url = reverse("tenant-detail", kwargs={"pk": tenant.id})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == tenant.id
        assert response.data["name"] == "Test Company"


@pytest.mark.django_db
class TestTenantSettings:
    """Tests for tenant settings endpoint."""

    def test_get_settings(
        self, authenticated_client, user, tenant, tenant_settings
    ):
        """Test getting tenant settings."""
        TenantMembership.objects.create(user=user, tenant=tenant)

        url = reverse("tenant-settings", kwargs={"pk": tenant.id})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "work_hours_per_day" in response.data
        assert "timesheet_period" in response.data

    def test_get_settings_creates_if_not_exists(
        self, authenticated_client, user, tenant
    ):
        """Test getting settings creates them if they don't exist."""
        TenantMembership.objects.create(user=user, tenant=tenant)

        # Ensure no settings exist
        TenantSettings.objects.filter(tenant=tenant).delete()

        url = reverse("tenant-settings", kwargs={"pk": tenant.id})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert TenantSettings.objects.filter(tenant=tenant).exists()

    def test_update_settings(
        self, authenticated_client, user, tenant, tenant_settings
    ):
        """Test updating tenant settings."""
        TenantMembership.objects.create(user=user, tenant=tenant)

        url = reverse("tenant-settings", kwargs={"pk": tenant.id})
        data = {"timesheet_period": "weekly", "overtime_multiplier": "2.0"}

        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK

        tenant_settings.refresh_from_db()
        assert tenant_settings.timesheet_period == "weekly"
        assert tenant_settings.overtime_multiplier == Decimal("2.0")


@pytest.mark.django_db
class TestCurrentTenant:
    """Tests for current tenant endpoint."""

    def test_current_returns_request_tenant(
        self, authenticated_tenant_client, tenant
    ):
        """Test current endpoint returns tenant from request context."""
        url = reverse("tenant-current")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == tenant.id

    def test_current_no_tenant_context(
        self, authenticated_client
    ):
        """Test current returns 404 when no tenant context."""
        url = reverse("tenant-current")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "No tenant context" in response.data["detail"]
