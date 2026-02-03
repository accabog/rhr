"""
Tenant models for multi-tenancy support.
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class Tenant(TimestampedModel):
    """
    Represents an organization/company in the multi-tenant system.
    Each tenant has isolated data through the TenantAwareModel base class.
    """

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=100)
    domain = models.CharField(max_length=255, blank=True, null=True, unique=True)
    is_active = models.BooleanField(default=True)
    logo = models.ImageField(
        upload_to="tenant_logos/",
        blank=True,
        null=True,
        help_text="Full logo displayed when sidebar is expanded",
    )
    logo_icon = models.ImageField(
        upload_to="tenant_logos/icons/",
        blank=True,
        null=True,
        help_text="Compact icon/logo displayed when sidebar is collapsed",
    )

    # Subscription/billing fields (for future use)
    plan = models.CharField(
        max_length=50,
        choices=[
            ("free", "Free"),
            ("starter", "Starter"),
            ("professional", "Professional"),
            ("enterprise", "Enterprise"),
        ],
        default="free",
    )
    max_employees = models.PositiveIntegerField(default=10)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class TenantMembership(TimestampedModel):
    """
    Links users to tenants with role-based access.
    A user can belong to multiple tenants with different roles.
    """

    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("manager", "Manager"),
        ("employee", "Employee"),
        ("viewer", "Viewer"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tenant_memberships",
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="employee")
    is_default = models.BooleanField(
        default=False, help_text="Default tenant for this user"
    )

    class Meta:
        unique_together = ["user", "tenant"]
        ordering = ["-is_default", "tenant__name"]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.tenant.name} ({self.role})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        # Ensure only one default tenant per user
        if self.is_default:
            TenantMembership.objects.filter(user=self.user, is_default=True).exclude(
                pk=self.pk
            ).update(is_default=False)
        super().save(*args, **kwargs)


class TenantSettings(TimestampedModel):
    """
    Tenant-specific configuration settings.
    """

    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name="settings",
    )

    # Time tracking settings
    work_hours_per_day = models.DecimalField(max_digits=4, decimal_places=2, default=8.0)
    work_days_per_week = models.PositiveSmallIntegerField(default=5)
    overtime_multiplier = models.DecimalField(max_digits=3, decimal_places=2, default=1.5)

    # Leave settings
    default_annual_leave_days = models.PositiveIntegerField(default=20)
    default_sick_leave_days = models.PositiveIntegerField(default=10)
    leave_approval_required = models.BooleanField(default=True)

    # Timesheet settings
    timesheet_period = models.CharField(
        max_length=20,
        choices=[
            ("weekly", "Weekly"),
            ("biweekly", "Bi-weekly"),
            ("monthly", "Monthly"),
        ],
        default="biweekly",
    )
    timesheet_approval_required = models.BooleanField(default=True)

    # Localization
    timezone = models.CharField(max_length=50, default="UTC")
    date_format = models.CharField(max_length=20, default="YYYY-MM-DD")
    currency = models.CharField(max_length=3, default="USD")

    def __str__(self) -> str:
        return f"Settings for {self.tenant.name}"
