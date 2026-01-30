"""
Leave management models for PTO, sick leave, holidays, etc.
"""

from django.db import models

from apps.core.models import TenantAwareManager, TenantAwareModel


class LeaveType(TenantAwareModel):
    """Types of leave (vacation, sick, personal, etc.)."""

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    is_paid = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=True)
    max_consecutive_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum consecutive days allowed",
    )
    color = models.CharField(max_length=7, default="#10b981")  # Hex color
    is_active = models.BooleanField(default=True)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["name"]
        unique_together = ["tenant", "code"]

    def __str__(self):
        return self.name


class LeaveBalance(TenantAwareModel):
    """Employee's leave balance for a specific leave type and year."""

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name="balances",
    )
    year = models.PositiveIntegerField()
    entitled_days = models.DecimalField(max_digits=5, decimal_places=2)
    used_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    carried_over = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["-year", "leave_type__name"]
        unique_together = ["tenant", "employee", "leave_type", "year"]

    def __str__(self):
        return f"{self.employee} - {self.leave_type} ({self.year})"

    @property
    def remaining_days(self):
        return self.entitled_days + self.carried_over - self.used_days


class LeaveRequest(TenantAwareModel):
    """Employee leave request."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    ]

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name="requests",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    is_half_day = models.BooleanField(default=False)
    half_day_period = models.CharField(
        max_length=10,
        choices=[("morning", "Morning"), ("afternoon", "Afternoon")],
        blank=True,
    )
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Approval tracking
    reviewed_by = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_leave_requests",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.employee} - {self.leave_type} ({self.start_date} to {self.end_date})"

    @property
    def days_requested(self):
        if self.is_half_day:
            return 0.5
        delta = self.end_date - self.start_date
        return delta.days + 1


class Holiday(TenantAwareModel):
    """Company or public holidays."""

    name = models.CharField(max_length=255)
    date = models.DateField()
    is_recurring = models.BooleanField(
        default=False,
        help_text="Recurs every year on the same date",
    )
    applies_to_all = models.BooleanField(
        default=True,
        help_text="Applies to all employees",
    )
    departments = models.ManyToManyField(
        "employees.Department",
        blank=True,
        related_name="holidays",
        help_text="If not applies_to_all, only these departments",
    )
    country = models.CharField(
        max_length=2,
        blank=True,
        help_text="ISO 3166-1 alpha-2 country code for national holidays",
    )

    objects = TenantAwareManager()

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"{self.name} ({self.date})"
