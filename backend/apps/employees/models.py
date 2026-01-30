"""
Employee models for HR management.
"""

from django.conf import settings
from django.db import models

from apps.core.models import TenantAwareManager, TenantAwareModel


class Department(TenantAwareModel):
    """Organizational unit/department within a tenant."""

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    manager = models.ForeignKey(
        "Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_departments",
    )
    is_active = models.BooleanField(default=True)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["name"]
        unique_together = ["tenant", "code"]

    def __str__(self):
        return self.name


class Position(TenantAwareModel):
    """Job title/position within a tenant."""

    title = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="positions",
    )
    level = models.PositiveSmallIntegerField(
        default=1,
        help_text="Seniority level (1=entry, 5=senior, etc.)",
    )
    is_active = models.BooleanField(default=True)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class Employee(TenantAwareModel):
    """
    Employee record within a tenant.
    May optionally be linked to a User for system access.
    """

    EMPLOYMENT_STATUS = [
        ("active", "Active"),
        ("on_leave", "On Leave"),
        ("terminated", "Terminated"),
        ("suspended", "Suspended"),
    ]

    # Link to User (optional - not all employees need system access)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profiles",
    )

    # Basic info
    employee_id = models.CharField(max_length=50)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    avatar = models.ImageField(upload_to="employee_avatars/", blank=True, null=True)

    # Employment details
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    position = models.ForeignKey(
        Position,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="direct_reports",
    )
    hire_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=EMPLOYMENT_STATUS,
        default="active",
    )

    # Personal info
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=255, blank=True)
    emergency_contact_phone = models.CharField(max_length=50, blank=True)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["last_name", "first_name"]
        unique_together = ["tenant", "employee_id"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
