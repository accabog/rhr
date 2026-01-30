"""
Contract models for employment agreements.
"""

from django.db import models

from apps.core.models import TenantAwareManager, TenantAwareModel


class ContractType(TenantAwareModel):
    """Types of contracts (full-time, part-time, contractor, etc.)."""

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["name"]
        unique_together = ["tenant", "code"]

    def __str__(self):
        return self.name


class Contract(TenantAwareModel):
    """Employment contract."""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("active", "Active"),
        ("expired", "Expired"),
        ("terminated", "Terminated"),
    ]

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="contracts",
    )
    contract_type = models.ForeignKey(
        ContractType,
        on_delete=models.PROTECT,
        related_name="contracts",
    )
    title = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Compensation
    salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(max_length=3, default="USD")
    salary_period = models.CharField(
        max_length=20,
        choices=[
            ("hourly", "Hourly"),
            ("daily", "Daily"),
            ("weekly", "Weekly"),
            ("monthly", "Monthly"),
            ("yearly", "Yearly"),
        ],
        default="monthly",
    )

    # Working hours
    hours_per_week = models.DecimalField(max_digits=4, decimal_places=1, default=40.0)

    # Probation
    probation_end_date = models.DateField(null=True, blank=True)
    probation_passed = models.BooleanField(default=False)

    # Notice period
    notice_period_days = models.PositiveIntegerField(default=30)

    # Notes
    notes = models.TextField(blank=True)

    objects = TenantAwareManager()

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.employee} - {self.title}"


class ContractDocument(TenantAwareModel):
    """Documents attached to a contract."""

    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to="contract_documents/")
    uploaded_by = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_documents",
    )

    objects = TenantAwareManager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.contract})"
