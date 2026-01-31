"""
Core models - base classes for all tenant-aware models.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Self, TypeVar

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
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


class Document(TenantAwareModel):
    """
    Centralized document storage with polymorphic entity linking.

    Documents can be attached to any tenant-aware model (Employee, LeaveRequest,
    Contract, etc.) using Django's ContentType framework.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # File storage
    file = models.FileField(upload_to="documents/%Y/%m/")
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100)

    # Metadata
    name = models.CharField(max_length=255, help_text="Display name for the document")
    description = models.TextField(blank=True)

    # Generic relation to any entity
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        help_text="The type of entity this document is attached to",
    )
    object_id = models.PositiveIntegerField(
        help_text="The ID of the entity this document is attached to"
    )
    content_object = GenericForeignKey("content_type", "object_id")

    # Audit
    uploaded_by = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_core_documents",
    )

    objects = TenantAwareManager["Document"]()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["tenant", "content_type"]),
        ]

    def __str__(self) -> str:
        return self.name
