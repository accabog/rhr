"""
Timesheet models for period-based time summaries and approvals.
"""

from django.db import models

from apps.core.models import TenantAwareManager, TenantAwareModel


class Timesheet(TenantAwareModel):
    """Period-based timesheet for an employee."""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="timesheets",
    )
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Calculated totals
    total_regular_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    total_overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    total_break_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    # Submission/approval tracking
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_timesheets",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["-period_start"]
        unique_together = ["tenant", "employee", "period_start"]

    def __str__(self):
        return f"{self.employee} - {self.period_start} to {self.period_end}"


class TimesheetComment(TenantAwareModel):
    """Comments on timesheets during approval workflow."""

    timesheet = models.ForeignKey(
        Timesheet,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="timesheet_comments",
    )
    content = models.TextField()

    objects = TenantAwareManager()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author} on {self.timesheet}"
