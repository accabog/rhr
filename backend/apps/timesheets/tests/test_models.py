"""
Tests for timesheets models.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.db import IntegrityError

from apps.timesheets.models import Timesheet, TimesheetComment


@pytest.mark.django_db
class TestTimesheet:
    """Tests for Timesheet model."""

    def test_create_timesheet(self, tenant, employee):
        """Test creating a timesheet."""
        period_start = date.today() - timedelta(days=14)
        period_end = date.today() - timedelta(days=1)

        timesheet = Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=period_start,
            period_end=period_end,
        )

        assert timesheet.status == "draft"
        assert timesheet.total_regular_hours == Decimal("0")
        assert timesheet.total_overtime_hours == Decimal("0")
        assert timesheet.submitted_at is None
        assert timesheet.approved_by is None

    def test_str_representation(self, timesheet):
        """Test string representation."""
        assert str(timesheet.employee) in str(timesheet)
        assert str(timesheet.period_start) in str(timesheet)

    def test_unique_constraint_employee_period(self, tenant, employee):
        """Test unique constraint on employee + period_start."""
        period_start = date.today() - timedelta(days=14)
        period_end = date.today() - timedelta(days=1)

        Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=period_start,
            period_end=period_end,
        )

        with pytest.raises(IntegrityError):
            Timesheet.objects.create(
                tenant=tenant,
                employee=employee,
                period_start=period_start,  # Same period_start
                period_end=period_end,
            )

    def test_different_employees_same_period(self, tenant, employee, manager_employee):
        """Test different employees can have same period."""
        period_start = date.today() - timedelta(days=14)
        period_end = date.today() - timedelta(days=1)

        ts1 = Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=period_start,
            period_end=period_end,
        )
        ts2 = Timesheet.objects.create(
            tenant=tenant,
            employee=manager_employee,
            period_start=period_start,
            period_end=period_end,
        )

        assert ts1.id != ts2.id

    def test_status_choices(self, tenant, employee):
        """Test all status choices are valid."""
        period_start = date.today()
        statuses = ["draft", "submitted", "approved", "rejected"]

        for i, status_val in enumerate(statuses):
            ts = Timesheet.objects.create(
                tenant=tenant,
                employee=employee,
                period_start=period_start + timedelta(days=i * 14),
                period_end=period_start + timedelta(days=i * 14 + 13),
                status=status_val,
            )
            assert ts.status == status_val

    def test_ordering(self, tenant, employee):
        """Test default ordering (most recent period first)."""
        ts1 = Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=date(2024, 1, 1),
            period_end=date(2024, 1, 14),
        )
        ts2 = Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=date(2024, 2, 1),
            period_end=date(2024, 2, 14),
        )
        ts3 = Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=date(2024, 1, 15),
            period_end=date(2024, 1, 28),
        )

        timesheets = list(Timesheet.objects.filter(tenant=tenant, employee=employee))
        assert timesheets[0] == ts2  # Feb first
        assert timesheets[1] == ts3  # Late Jan
        assert timesheets[2] == ts1  # Early Jan

    def test_approval_tracking(self, tenant, employee, manager_employee):
        """Test approval tracking fields."""
        from django.utils import timezone

        timesheet = Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="submitted",
        )

        now = timezone.now()
        timesheet.status = "approved"
        timesheet.approved_by = manager_employee
        timesheet.approved_at = now
        timesheet.save()

        timesheet.refresh_from_db()
        assert timesheet.approved_by == manager_employee
        assert timesheet.approved_at is not None

    def test_rejection_reason(self, tenant, employee):
        """Test rejection reason field."""
        timesheet = Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="rejected",
            rejection_reason="Missing project codes",
        )

        assert timesheet.rejection_reason == "Missing project codes"


@pytest.mark.django_db
class TestTimesheetComment:
    """Tests for TimesheetComment model."""

    def test_create_comment(self, tenant, timesheet, employee):
        """Test creating a timesheet comment."""
        comment = TimesheetComment.objects.create(
            tenant=tenant,
            timesheet=timesheet,
            author=employee,
            content="Please review the overtime entries.",
        )

        assert comment.timesheet == timesheet
        assert comment.author == employee
        assert comment.content == "Please review the overtime entries."

    def test_str_representation(self, tenant, timesheet, employee):
        """Test string representation."""
        comment = TimesheetComment.objects.create(
            tenant=tenant,
            timesheet=timesheet,
            author=employee,
            content="Test comment",
        )

        assert str(employee) in str(comment)
        assert str(timesheet) in str(comment)

    def test_ordering(self, tenant, timesheet, employee):
        """Test comments are ordered by created_at (oldest first)."""
        import time as time_module

        comment1 = TimesheetComment.objects.create(
            tenant=tenant,
            timesheet=timesheet,
            author=employee,
            content="First comment",
        )
        time_module.sleep(0.1)
        comment2 = TimesheetComment.objects.create(
            tenant=tenant,
            timesheet=timesheet,
            author=employee,
            content="Second comment",
        )

        comments = list(timesheet.comments.all())
        assert comments[0] == comment1
        assert comments[1] == comment2
