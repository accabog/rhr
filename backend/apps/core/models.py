"""
Core models - base classes for all tenant-aware models.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Self, TypeVar

from django.db import models

if TYPE_CHECKING:
    from apps.tenants.models import Tenant

_T = TypeVar("_T", bound=models.Model)


class TimestampedModel(models.Model):
    """Abstract base model with created/updated timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantAwareModel(TimestampedModel):
    """
    Abstract base model for all tenant-scoped models.

    All models that should be isolated per tenant should inherit from this.
    The TenantMiddleware and TenantAwareManager handle automatic filtering.
    """

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
    )

    class Meta:
        abstract = True


class TenantAwareQuerySet(models.QuerySet[_T]):
    """QuerySet that supports tenant filtering."""

    def for_tenant(self, tenant: Tenant | None) -> Self:
        return self.filter(tenant=tenant)


class TenantAwareManager(models.Manager[_T]):
    """
    Manager that automatically filters by tenant from the current request.

    Usage in views:
        # In a view with request.tenant set by TenantMiddleware
        Employee.objects.for_tenant(request.tenant).all()
    """

    def get_queryset(self) -> TenantAwareQuerySet[_T]:
        return TenantAwareQuerySet(self.model, using=self._db)

    def for_tenant(self, tenant: Tenant | None) -> TenantAwareQuerySet[_T]:
        return self.get_queryset().for_tenant(tenant)
