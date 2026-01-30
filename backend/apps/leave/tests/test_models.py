"""
Tests for leave models.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.db import IntegrityError

from apps.leave.models import Holiday, LeaveBalance, LeaveRequest, LeaveType


@pytest.mark.django_db
class TestLeaveType:
    """Tests for LeaveType model."""

    def test_create_leave_type(self, tenant):
        """Test creating a leave type."""
        leave_type = LeaveType.objects.create(
            tenant=tenant,
            name="Annual Leave",
            code="ANNUAL",
            is_paid=True,
            requires_approval=True,
            max_consecutive_days=14,
            color="#10b981",
        )

        assert leave_type.name == "Annual Leave"
        assert leave_type.code == "ANNUAL"
        assert leave_type.is_paid is True
        assert leave_type.requires_approval is True
        assert leave_type.max_consecutive_days == 14
        assert leave_type.is_active is True

    def test_str_representation(self, leave_type):
        """Test string representation."""
        assert str(leave_type) == "Annual Leave"

    def test_unique_code_per_tenant(self, tenant, leave_type):
        """Test code must be unique within tenant."""
        with pytest.raises(IntegrityError):
            LeaveType.objects.create(
                tenant=tenant,
                name="Another Annual",
                code="ANNUAL",  # Same code
            )

    def test_same_code_different_tenants(self, tenant, tenant2):
        """Test same code allowed in different tenants."""
        type1 = LeaveType.objects.create(
            tenant=tenant, name="Annual", code="ANNUAL"
        )
        type2 = LeaveType.objects.create(
            tenant=tenant2, name="Annual", code="ANNUAL"
        )

        assert type1.code == type2.code
        assert type1.tenant != type2.tenant


@pytest.mark.django_db
class TestLeaveBalance:
    """Tests for LeaveBalance model."""

    def test_create_leave_balance(self, tenant, employee, leave_type):
        """Test creating a leave balance."""
        balance = LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            year=2024,
            entitled_days=Decimal("20.0"),
            used_days=Decimal("5.0"),
            carried_over=Decimal("2.0"),
        )

        assert balance.entitled_days == Decimal("20.0")
        assert balance.used_days == Decimal("5.0")
        assert balance.carried_over == Decimal("2.0")

    def test_str_representation(self, leave_balance):
        """Test string representation."""
        assert str(leave_balance.employee) in str(leave_balance)
        assert str(leave_balance.leave_type) in str(leave_balance)

    def test_remaining_days_calculation(self, tenant, employee, leave_type):
        """Test remaining_days property calculation."""
        balance = LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            year=2024,
            entitled_days=Decimal("20.0"),
            used_days=Decimal("5.0"),
            carried_over=Decimal("3.0"),
        )

        # remaining = entitled + carried_over - used = 20 + 3 - 5 = 18
        assert balance.remaining_days == Decimal("18.0")

    def test_remaining_days_no_carryover(self, tenant, employee, leave_type):
        """Test remaining days without carryover."""
        balance = LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            year=2024,
            entitled_days=Decimal("20.0"),
            used_days=Decimal("10.0"),
            carried_over=Decimal("0.0"),
        )

        assert balance.remaining_days == Decimal("10.0")

    def test_remaining_days_can_be_negative(self, tenant, employee, leave_type):
        """Test remaining days can be negative (overdraft)."""
        balance = LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            year=2024,
            entitled_days=Decimal("20.0"),
            used_days=Decimal("25.0"),
            carried_over=Decimal("0.0"),
        )

        assert balance.remaining_days == Decimal("-5.0")

    def test_unique_constraint(self, tenant, employee, leave_type):
        """Test unique constraint on employee + leave_type + year."""
        LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            year=2024,
            entitled_days=Decimal("20.0"),
        )

        with pytest.raises(IntegrityError):
            LeaveBalance.objects.create(
                tenant=tenant,
                employee=employee,
                leave_type=leave_type,
                year=2024,  # Same year
                entitled_days=Decimal("25.0"),
            )

    def test_same_employee_different_years(self, tenant, employee, leave_type):
        """Test same employee can have balances for different years."""
        bal2023 = LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            year=2023,
            entitled_days=Decimal("20.0"),
        )
        bal2024 = LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            year=2024,
            entitled_days=Decimal("22.0"),
        )

        assert bal2023.year != bal2024.year


@pytest.mark.django_db
class TestLeaveRequest:
    """Tests for LeaveRequest model."""

    def test_create_leave_request(self, tenant, employee, leave_type):
        """Test creating a leave request."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date(2024, 7, 1),
            end_date=date(2024, 7, 5),
            reason="Summer vacation",
        )

        assert request.status == "pending"
        assert request.is_half_day is False
        assert request.reviewed_by is None

    def test_str_representation(self, leave_request):
        """Test string representation."""
        assert str(leave_request.employee) in str(leave_request)
        assert str(leave_request.leave_type) in str(leave_request)

    def test_days_requested_full_days(self, tenant, employee, leave_type):
        """Test days_requested for full days."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date(2024, 7, 1),
            end_date=date(2024, 7, 5),  # 5 days
            is_half_day=False,
        )

        assert request.days_requested == 5

    def test_days_requested_single_day(self, tenant, employee, leave_type):
        """Test days_requested for single day."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date(2024, 7, 1),
            end_date=date(2024, 7, 1),
            is_half_day=False,
        )

        assert request.days_requested == 1

    def test_days_requested_half_day(self, tenant, employee, leave_type):
        """Test days_requested returns 0.5 for half day."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date(2024, 7, 1),
            end_date=date(2024, 7, 1),
            is_half_day=True,
            half_day_period="morning",
        )

        assert request.days_requested == 0.5

    def test_half_day_period_choices(self, tenant, employee, leave_type):
        """Test half day period options."""
        morning = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date(2024, 7, 1),
            end_date=date(2024, 7, 1),
            is_half_day=True,
            half_day_period="morning",
        )

        afternoon = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date(2024, 7, 2),
            end_date=date(2024, 7, 2),
            is_half_day=True,
            half_day_period="afternoon",
        )

        assert morning.half_day_period == "morning"
        assert afternoon.half_day_period == "afternoon"

    def test_status_choices(self, tenant, employee, leave_type):
        """Test all status choices."""
        statuses = ["pending", "approved", "rejected", "cancelled"]

        for i, status_val in enumerate(statuses):
            request = LeaveRequest.objects.create(
                tenant=tenant,
                employee=employee,
                leave_type=leave_type,
                start_date=date(2024, 7, 1) + timedelta(days=i * 7),
                end_date=date(2024, 7, 5) + timedelta(days=i * 7),
                status=status_val,
            )
            assert request.status == status_val

    def test_review_tracking(self, tenant, employee, leave_type, manager_employee):
        """Test review tracking fields."""
        from django.utils import timezone

        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date(2024, 7, 1),
            end_date=date(2024, 7, 5),
        )

        now = timezone.now()
        request.status = "approved"
        request.reviewed_by = manager_employee
        request.reviewed_at = now
        request.review_notes = "Approved for vacation"
        request.save()

        request.refresh_from_db()
        assert request.reviewed_by == manager_employee
        assert request.reviewed_at is not None
        assert request.review_notes == "Approved for vacation"

    def test_ordering(self, tenant, employee, leave_type):
        """Test default ordering (most recent start_date first)."""
        req1 = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date(2024, 6, 1),
            end_date=date(2024, 6, 5),
        )
        req2 = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date(2024, 8, 1),
            end_date=date(2024, 8, 5),
        )
        req3 = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date(2024, 7, 1),
            end_date=date(2024, 7, 5),
        )

        requests = list(LeaveRequest.objects.filter(tenant=tenant, employee=employee))
        assert requests[0] == req2  # August first
        assert requests[1] == req3  # July
        assert requests[2] == req1  # June


@pytest.mark.django_db
class TestHoliday:
    """Tests for Holiday model."""

    def test_create_holiday(self, tenant):
        """Test creating a holiday."""
        holiday = Holiday.objects.create(
            tenant=tenant,
            name="New Year's Day",
            date=date(2024, 1, 1),
            is_recurring=True,
            applies_to_all=True,
        )

        assert holiday.name == "New Year's Day"
        assert holiday.date == date(2024, 1, 1)
        assert holiday.is_recurring is True
        assert holiday.applies_to_all is True

    def test_str_representation(self, tenant):
        """Test string representation."""
        holiday = Holiday.objects.create(
            tenant=tenant,
            name="Christmas",
            date=date(2024, 12, 25),
        )

        assert "Christmas" in str(holiday)
        assert "2024-12-25" in str(holiday)

    def test_holiday_with_departments(self, tenant, department, department2):
        """Test holiday applying to specific departments."""
        holiday = Holiday.objects.create(
            tenant=tenant,
            name="Engineering Day",
            date=date(2024, 9, 15),
            applies_to_all=False,
        )
        holiday.departments.add(department)

        assert department in holiday.departments.all()
        assert department2 not in holiday.departments.all()

    def test_ordering(self, tenant):
        """Test holidays are ordered by date."""
        h1 = Holiday.objects.create(
            tenant=tenant,
            name="Holiday C",
            date=date(2024, 12, 25),
        )
        h2 = Holiday.objects.create(
            tenant=tenant,
            name="Holiday A",
            date=date(2024, 1, 1),
        )
        h3 = Holiday.objects.create(
            tenant=tenant,
            name="Holiday B",
            date=date(2024, 7, 4),
        )

        holidays = list(Holiday.objects.filter(tenant=tenant))
        assert holidays[0] == h2  # Jan 1
        assert holidays[1] == h3  # Jul 4
        assert holidays[2] == h1  # Dec 25
