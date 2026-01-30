"""
Time tracking models for clock in/out and time entries.
"""

from django.db import models

from apps.core.models import TenantAwareManager, TenantAwareModel


class TimeEntryType(TenantAwareModel):
    """Types of time entries (regular, overtime, break, etc.)."""

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    is_paid = models.BooleanField(default=True)
    multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=1.0,
        help_text="Pay multiplier (e.g., 1.5 for overtime)",
    )
    color = models.CharField(max_length=7, default="#3b82f6")  # Hex color
    is_active = models.BooleanField(default=True)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["name"]
        unique_together = ["tenant", "code"]

    def __str__(self):
        return self.name


class TimeEntry(TenantAwareModel):
    """Individual time entry record."""

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="time_entries",
    )
    entry_type = models.ForeignKey(
        TimeEntryType,
        on_delete=models.PROTECT,
        related_name="entries",
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    break_minutes = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)

    # For project/task tracking (optional)
    project = models.CharField(max_length=255, blank=True)
    task = models.CharField(max_length=255, blank=True)

    # Approval status
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_time_entries",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["-date", "-start_time"]
        verbose_name_plural = "Time entries"

    def __str__(self):
        return f"{self.employee} - {self.date} ({self.entry_type})"

    @property
    def duration_minutes(self):
        """Calculate duration in minutes."""
        if not self.end_time:
            return 0
        start = self.start_time.hour * 60 + self.start_time.minute
        end = self.end_time.hour * 60 + self.end_time.minute
        return max(0, end - start - self.break_minutes)

    @property
    def duration_hours(self):
        """Calculate duration in hours."""
        return self.duration_minutes / 60
