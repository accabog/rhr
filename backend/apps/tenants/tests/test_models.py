"""
Tests for tenants models.
"""

from decimal import Decimal

import pytest
from django.db import IntegrityError

from apps.tenants.models import Tenant, TenantMembership, TenantSettings


@pytest.mark.django_db
class TestTenant:
    """Tests for Tenant model."""

    def test_create_tenant(self):
        """Test creating a tenant."""
        tenant = Tenant.objects.create(
            name="Acme Corporation",
            slug="acme-corp",
        )

        assert tenant.name == "Acme Corporation"
        assert tenant.slug == "acme-corp"
        assert tenant.is_active is True
        assert tenant.plan == "free"
        assert tenant.max_employees == 10

    def test_str_representation(self, tenant):
        """Test string representation."""
        assert str(tenant) == "Test Company"

    def test_slug_must_be_unique(self, tenant):
        """Test slug uniqueness."""
        with pytest.raises(IntegrityError):
            Tenant.objects.create(
                name="Different Name",
                slug="test-company",  # Same slug as fixture
            )

    def test_domain_must_be_unique(self, tenant):
        """Test domain uniqueness."""
        tenant.domain = "acme.example.com"
        tenant.save()

        with pytest.raises(IntegrityError):
            Tenant.objects.create(
                name="Other Corp",
                slug="other-corp",
                domain="acme.example.com",  # Same domain
            )

    def test_plan_choices(self):
        """Test all plan choices are valid."""
        plans = ["free", "starter", "professional", "enterprise"]

        for plan in plans:
            t = Tenant.objects.create(
                name=f"{plan} Tenant",
                slug=f"{plan}-tenant",
                plan=plan,
            )
            assert t.plan == plan

    def test_ordering(self):
        """Test default ordering by name."""
        t1 = Tenant.objects.create(name="Zeta Corp", slug="zeta-corp")
        t2 = Tenant.objects.create(name="Alpha Corp", slug="alpha-corp")
        t3 = Tenant.objects.create(name="Beta Corp", slug="beta-corp")

        tenants = list(Tenant.objects.all())
        assert tenants[0] == t2  # Alpha
        assert tenants[1] == t3  # Beta
        assert tenants[2] == t1  # Zeta


@pytest.mark.django_db
class TestTenantMembership:
    """Tests for TenantMembership model."""

    def test_create_membership(self, user, tenant):
        """Test creating a tenant membership."""
        membership = TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            role="employee",
            is_default=True,
        )

        assert membership.user == user
        assert membership.tenant == tenant
        assert membership.role == "employee"
        assert membership.is_default is True

    def test_str_representation(self, tenant_membership):
        """Test string representation."""
        assert "test@example.com" in str(tenant_membership)
        assert "Test Company" in str(tenant_membership)

    def test_role_choices(self, user, tenant):
        """Test all role choices are valid."""
        roles = ["owner", "admin", "manager", "employee", "viewer"]

        # Delete any existing membership
        TenantMembership.objects.filter(user=user, tenant=tenant).delete()

        for i, role in enumerate(roles):
            # Create tenant for each role
            t = Tenant.objects.create(
                name=f"Tenant for {role}",
                slug=f"tenant-{role}-{i}",
            )
            m = TenantMembership.objects.create(
                user=user,
                tenant=t,
                role=role,
            )
            assert m.role == role

    def test_unique_user_tenant(self, user, tenant):
        """Test user can only have one membership per tenant."""
        TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            role="employee",
        )

        with pytest.raises(IntegrityError):
            TenantMembership.objects.create(
                user=user,
                tenant=tenant,
                role="admin",  # Different role, same user/tenant
            )

    def test_single_default_tenant_per_user(self, user, tenant, tenant2):
        """Test only one membership can be default per user."""
        m1 = TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            is_default=True,
        )

        m2 = TenantMembership.objects.create(
            user=user,
            tenant=tenant2,
            is_default=True,  # Setting this as default
        )

        m1.refresh_from_db()
        m2.refresh_from_db()

        # m1 should no longer be default
        assert m1.is_default is False
        assert m2.is_default is True

    def test_update_to_default_clears_others(self, user, tenant, tenant2):
        """Test updating membership to default clears other defaults."""
        m1 = TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            is_default=True,
        )
        m2 = TenantMembership.objects.create(
            user=user,
            tenant=tenant2,
            is_default=False,
        )

        # Update m2 to be default
        m2.is_default = True
        m2.save()

        m1.refresh_from_db()
        assert m1.is_default is False
        assert m2.is_default is True

    def test_user_can_belong_to_multiple_tenants(self, user, tenant, tenant2):
        """Test user can have memberships in multiple tenants."""
        m1 = TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            is_default=True,
        )
        m2 = TenantMembership.objects.create(
            user=user,
            tenant=tenant2,
            is_default=False,
        )

        assert user.tenant_memberships.count() == 2


@pytest.mark.django_db
class TestTenantSettings:
    """Tests for TenantSettings model."""

    def test_create_settings(self, tenant):
        """Test creating tenant settings."""
        settings = TenantSettings.objects.create(
            tenant=tenant,
            work_hours_per_day=Decimal("8.0"),
            work_days_per_week=5,
            overtime_multiplier=Decimal("1.5"),
        )

        assert settings.work_hours_per_day == Decimal("8.0")
        assert settings.work_days_per_week == 5
        assert settings.overtime_multiplier == Decimal("1.5")

    def test_str_representation(self, tenant_settings):
        """Test string representation."""
        assert "Test Company" in str(tenant_settings)

    def test_default_values(self, tenant):
        """Test default values."""
        settings = TenantSettings.objects.create(tenant=tenant)

        assert settings.work_hours_per_day == Decimal("8.0")
        assert settings.work_days_per_week == 5
        assert settings.overtime_multiplier == Decimal("1.5")
        assert settings.default_annual_leave_days == 20
        assert settings.default_sick_leave_days == 10
        assert settings.leave_approval_required is True
        assert settings.timesheet_period == "biweekly"
        assert settings.timesheet_approval_required is True
        assert settings.timezone == "UTC"
        assert settings.currency == "USD"

    def test_one_settings_per_tenant(self, tenant_settings, tenant):
        """Test only one settings per tenant."""
        with pytest.raises(IntegrityError):
            TenantSettings.objects.create(tenant=tenant)

    def test_timesheet_period_choices(self, tenant):
        """Test timesheet period choices."""
        periods = ["weekly", "biweekly", "monthly"]

        # Delete existing
        TenantSettings.objects.filter(tenant=tenant).delete()

        for period in periods:
            TenantSettings.objects.filter(tenant=tenant).delete()
            settings = TenantSettings.objects.create(
                tenant=tenant,
                timesheet_period=period,
            )
            assert settings.timesheet_period == period
