"""
Leave management models for PTO, sick leave, holidays, etc.
"""

from django.contrib.contenttypes.fields import GenericRelation
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

    # Documents (e.g., medical certificates)
    documents = GenericRelation("core.Document")

    objects = TenantAwareManager()

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.employee} - {self.leave_type} ({self.start_date} to {self.end_date})"

    def get_applicable_holidays(self):
        """
        Get holidays that fall within this leave request's date range
        and apply to the employee based on their department's country.

        Returns:
            QuerySet of Holiday objects that should be excluded from days calculation
        """
        # Import here to avoid circular imports
        from apps.leave.models import Holiday

        if not self.tenant_id or not self.employee_id:
            return Holiday.objects.none()

        # Get employee's department country
        employee_country = None
        if self.employee.department and self.employee.department.country:
            employee_country = self.employee.department.country

        # Query holidays within the date range
        holidays = Holiday.objects.filter(
            tenant=self.tenant,
            date__gte=self.start_date,
            date__lte=self.end_date,
        )

        if employee_country:
            # Include holidays that either:
            # 1. Match the employee's country, OR
            # 2. Have no country set (company-wide holidays)
            from django.db.models import Q

            holidays = holidays.filter(Q(country=employee_country) | Q(country=""))
        else:
            # No country on department, only include company-wide holidays
            holidays = holidays.filter(country="")

        # TODO: Further filter by applies_to_all / departments if needed
        # For now, we include all matching holidays

        return holidays

    @property
    def holidays_excluded(self):
        """List of holiday dates that are excluded from this leave request."""
        return list(self.get_applicable_holidays().values_list("date", flat=True))

    @property
    def holidays_excluded_count(self):
        """Number of holidays excluded from this leave request."""
        return self.get_applicable_holidays().count()

    @property
    def total_calendar_days(self):
        """Total calendar days in the leave period (without any exclusions)."""
        if self.is_half_day:
            return 0.5
        delta = self.end_date - self.start_date
        return delta.days + 1

    @property
    def days_requested(self):
        """
        Working days requested, excluding national/company holidays.
        This is the actual number of days deducted from leave balance.
        """
        if self.is_half_day:
            # Half-day: only exclude if that specific date is a holiday
            if self.get_applicable_holidays().filter(date=self.start_date).exists():
                return 0  # It's a holiday, no leave needed
            return 0.5

        total_days = self.total_calendar_days
        excluded_holidays = self.holidays_excluded_count

        return max(0, total_days - excluded_holidays)


class Holiday(TenantAwareModel):
    """Company or public holidays."""

    SOURCE_CHOICES = [
        ("manual", "Manual"),
        ("nager_date", "Nager.Date API"),
    ]

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

    # Fields for synced holidays
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default="manual",
        help_text="Origin of this holiday entry",
    )
    external_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="External identifier from API source",
    )
    local_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Holiday name in local language",
    )
    holiday_types = models.JSONField(
        default=list,
        blank=True,
        help_text="Types of holiday (e.g., Public, Bank, National)",
    )

    objects = TenantAwareManager()

    class Meta:
        ordering = ["date"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "country", "date", "name"],
                name="unique_holiday_per_tenant_country_date",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.date})"
