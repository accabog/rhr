"""
Tests for timetracking models.
"""

from datetime import date, time
from decimal import Decimal

import pytest

from apps.timetracking.models import TimeEntry, TimeEntryType


@pytest.mark.django_db
class TestTimeEntryType:
    """Tests for TimeEntryType model."""

    def test_create_time_entry_type(self, tenant):
        """Test creating a time entry type."""
        entry_type = TimeEntryType.objects.create(
            tenant=tenant,
            name="Regular",
            code="REG",
            is_paid=True,
            multiplier=Decimal("1.0"),
        )

        assert entry_type.name == "Regular"
        assert entry_type.code == "REG"
        assert entry_type.is_paid is True
        assert entry_type.multiplier == Decimal("1.0")
        assert entry_type.is_active is True

    def test_overtime_entry_type(self, tenant):
        """Test creating an overtime entry type with multiplier."""
        ot_type = TimeEntryType.objects.create(
            tenant=tenant,
            name="Overtime",
            code="OT",
            is_paid=True,
            multiplier=Decimal("1.5"),
        )

        assert ot_type.multiplier == Decimal("1.5")

    def test_str_representation(self, time_entry_type):
        """Test string representation."""
        assert str(time_entry_type) == "Regular"

    def test_unique_code_per_tenant(self, tenant, time_entry_type):
        """Test that code must be unique within a tenant."""
        with pytest.raises(Exception):  # IntegrityError
            TimeEntryType.objects.create(
                tenant=tenant,
                name="Another Regular",
                code="REG",  # Same code as time_entry_type
            )

    def test_same_code_different_tenants(self, tenant, tenant2):
        """Test same code is allowed in different tenants."""
        type1 = TimeEntryType.objects.create(
            tenant=tenant, name="Regular", code="REG"
        )
        type2 = TimeEntryType.objects.create(
            tenant=tenant2, name="Regular", code="REG"
        )

        assert type1.code == type2.code
        assert type1.tenant != type2.tenant


@pytest.mark.django_db
class TestTimeEntry:
    """Tests for TimeEntry model."""

    def test_create_time_entry(self, tenant, employee, time_entry_type):
        """Test creating a time entry."""
        entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(17, 0),
            break_minutes=60,
        )

        assert entry.employee == employee
        assert entry.entry_type == time_entry_type
        assert entry.date == date.today()
        assert entry.break_minutes == 60
        assert entry.is_approved is False

    def test_str_representation(self, time_entry):
        """Test string representation."""
        assert str(time_entry.employee) in str(time_entry)
        assert str(time_entry.date) in str(time_entry)

    def test_duration_minutes_calculation(self, tenant, employee, time_entry_type):
        """Test duration_minutes property calculates correctly."""
        entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(17, 0),
            break_minutes=60,
        )

        # 8 hours = 480 minutes - 60 break = 420 minutes
        assert entry.duration_minutes == 420

    def test_duration_minutes_no_break(self, tenant, employee, time_entry_type):
        """Test duration without break time."""
        entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(12, 0),
            break_minutes=0,
        )

        # 3 hours = 180 minutes
        assert entry.duration_minutes == 180

    def test_duration_minutes_no_end_time(self, tenant, employee, time_entry_type):
        """Test duration returns 0 when no end_time (active entry)."""
        entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=None,
            break_minutes=0,
        )

        assert entry.duration_minutes == 0

    def test_duration_hours_calculation(self, tenant, employee, time_entry_type):
        """Test duration_hours property calculates correctly."""
        entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(17, 0),
            break_minutes=60,
        )

        # 420 minutes = 7 hours
        assert entry.duration_hours == 7.0

    def test_duration_minutes_with_large_break(self, tenant, employee, time_entry_type):
        """Test that duration doesn't go negative with large break."""
        entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(10, 0),
            break_minutes=120,  # 2 hour break in 1 hour work
        )

        # Should be max(0, ...) = 0
        assert entry.duration_minutes == 0

    def test_approval_fields(self, tenant, employee, time_entry_type, manager_employee):
        """Test approval tracking fields."""
        from django.utils import timezone

        entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(17, 0),
            break_minutes=60,
        )

        assert entry.is_approved is False
        assert entry.approved_by is None
        assert entry.approved_at is None

        # Approve the entry
        now = timezone.now()
        entry.is_approved = True
        entry.approved_by = manager_employee
        entry.approved_at = now
        entry.save()

        entry.refresh_from_db()
        assert entry.is_approved is True
        assert entry.approved_by == manager_employee
        assert entry.approved_at is not None

    def test_project_and_task_fields(self, tenant, employee, time_entry_type):
        """Test optional project/task tracking fields."""
        entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(17, 0),
            project="RHR Development",
            task="Implement tests",
        )

        assert entry.project == "RHR Development"
        assert entry.task == "Implement tests"

    def test_notes_field(self, tenant, employee, time_entry_type):
        """Test notes field."""
        entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(17, 0),
            notes="Worked on feature X",
        )

        assert entry.notes == "Worked on feature X"

    def test_ordering(self, tenant, employee, time_entry_type):
        """Test default ordering (most recent first)."""
        from datetime import timedelta

        entry1 = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today() - timedelta(days=2),
            start_time=time(9, 0),
            end_time=time(17, 0),
        )
        entry2 = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(17, 0),
        )
        entry3 = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=date.today() - timedelta(days=1),
            start_time=time(9, 0),
            end_time=time(17, 0),
        )

        entries = list(TimeEntry.objects.filter(tenant=tenant))
        assert entries[0] == entry2  # Most recent date first
        assert entries[1] == entry3
        assert entries[2] == entry1
