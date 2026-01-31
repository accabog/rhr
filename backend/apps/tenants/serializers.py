"""
Tenant serializers.
"""

from rest_framework import serializers

from .models import Tenant, TenantMembership, TenantSettings


class TenantSerializer(serializers.ModelSerializer):
    """Serializer for Tenant model."""

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "domain",
            "is_active",
            "logo",
            "logo_icon",
            "plan",
            "max_employees",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TenantMembershipSerializer(serializers.ModelSerializer):
    """Serializer for TenantMembership model."""

    tenant = TenantSerializer(read_only=True)
    tenant_id = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(),
        source="tenant",
        write_only=True,
    )

    class Meta:
        model = TenantMembership
        fields = [
            "id",
            "tenant",
            "tenant_id",
            "role",
            "is_default",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class TenantSettingsSerializer(serializers.ModelSerializer):
    """Serializer for TenantSettings model."""

    class Meta:
        model = TenantSettings
        fields = [
            "work_hours_per_day",
            "work_days_per_week",
            "overtime_multiplier",
            "default_annual_leave_days",
            "default_sick_leave_days",
            "leave_approval_required",
            "timesheet_period",
            "timesheet_approval_required",
            "timezone",
            "date_format",
            "currency",
        ]
