"""
Core models - base classes for all tenant-aware models.
"""

from django.db import models


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


class TenantAwareQuerySet(models.QuerySet):
    """QuerySet that supports tenant filtering."""

    def for_tenant(self, tenant):
        return self.filter(tenant=tenant)


class TenantAwareManager(models.Manager):
    """
    Manager that automatically filters by tenant from the current request.

    Usage in views:
        # In a view with request.tenant set by TenantMiddleware
        Employee.objects.for_tenant(request.tenant).all()
    """

    def get_queryset(self):
        return TenantAwareQuerySet(self.model, using=self._db)

    def for_tenant(self, tenant):
        return self.get_queryset().for_tenant(tenant)
