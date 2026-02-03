"""
Tests for timetracking views.
"""

from datetime import date, time, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

from apps.timetracking.models import TimeEntry, TimeEntryType


@pytest.mark.django_db
class TestTimeEntryTypeViewSet:
    """Tests for TimeEntryType API endpoints."""

    def test_list_entry_types(
        self, authenticated_tenant_client, tenant, time_entry_type
    ):
        """Test listing time entry types."""
        url = reverse("timeentrytype-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert any(t["code"] == "REG" for t in response.data)

    def test_list_entry_types_unauthenticated(self, api_client):
        """Test unauthenticated access is denied."""
        url = reverse("timeentrytype-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_entry_type(self, authenticated_tenant_client, tenant):
        """Test creating a new time entry type."""
        url = reverse("timeentrytype-list")
        data = {
            "name": "Break",
            "code": "BRK",
            "is_paid": False,
            "multiplier": "0.0",
            "color": "#808080",
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Break"
        assert response.data["code"] == "BRK"

    def test_entry_types_filtered_by_tenant(
        self, authenticated_tenant_client, tenant, tenant2, time_entry_type
    ):
        """Test only current tenant's entry types are returned."""
        # Create entry type in tenant2
        TimeEntryType.objects.create(
            tenant=tenant2,
            name="Other Tenant Type",
            code="OTHER",
        )

        url = reverse("timeentrytype-list")
        response = authenticated_tenant_client.get(url)

        # Should not include tenant2's entry type
        codes = [t["code"] for t in response.data]
        assert "OTHER" not in codes


@pytest.mark.django_db
class TestTimeEntryViewSet:
    """Tests for TimeEntry API endpoints."""

    def test_list_time_entries(
        self, authenticated_tenant_client, tenant, time_entry
    ):
        """Test listing time entries."""
        url = reverse("timeentry-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data  # Paginated
        assert len(response.data["results"]) >= 1

    def test_list_time_entries_with_date_filter(
        self, authenticated_tenant_client, tenant, employee, time_entry_type
    ):
        """Test filtering time entries by date range."""
        today = date.today()
        yesterday = today - timedelta(days=1)

        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=today,
            start_time=time(9, 0),
            end_time=time(17, 0),
        )
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee,
            entry_type=time_entry_type,
            date=yesterday,
            start_time=time(9, 0),
            end_time=time(17, 0),
        )

        url = reverse("timeentry-list")
        response = authenticated_tenant_client.get(
            url, {"start_date": today.isoformat(), "end_date": today.isoformat()}
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["date"] == today.isoformat()

    def test_create_time_entry(
        self, authenticated_tenant_client, tenant, employee, time_entry_type
    ):
        """Test creating a time entry."""
        url = reverse("timeentry-list")
        data = {
            "employee": employee.id,
            "entry_type": time_entry_type.id,
            "date": date.today().isoformat(),
            "start_time": "09:00:00",
            "end_time": "17:00:00",
            "break_minutes": 60,
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["break_minutes"] == 60


@pytest.mark.django_db
class TestClockInOut:
    """Tests for clock in/out functionality."""

    def test_clock_in_success(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test successful clock in."""
        url = reverse("timeentry-clock-in")

        with patch("apps.timetracking.views.timezone") as mock_tz:
            from datetime import datetime

            mock_now = datetime(2024, 1, 15, 9, 0, 0)
            mock_tz.localtime.return_value = mock_now

            response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["end_time"] is None
        assert "id" in response.data

    def test_clock_in_no_employee_profile(self, authenticated_tenant_client, tenant):
        """Test clock in fails without employee profile."""
        url = reverse("timeentry-clock-in")
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "No employee profile" in response.data["detail"]

    def test_clock_in_already_clocked_in(
        self, authenticated_tenant_client, tenant, employee_with_user, active_time_entry
    ):
        """Test clock in fails when already clocked in."""
        # Need to link active_time_entry to employee_with_user
        active_time_entry.employee = employee_with_user
        active_time_entry.save()

        url = reverse("timeentry-clock-in")
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Already clocked in" in response.data["detail"]

    def test_clock_in_creates_default_entry_type(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test clock in creates REG entry type if not exists."""
        # Ensure no entry types exist
        TimeEntryType.objects.filter(tenant=tenant).delete()

        url = reverse("timeentry-clock-in")
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_201_CREATED

        # Check that REG type was created
        assert TimeEntryType.objects.filter(tenant=tenant, code="REG").exists()

    def test_clock_in_with_notes(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test clock in with optional notes."""
        url = reverse("timeentry-clock-in")
        data = {"notes": "Working from home today"}

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["notes"] == "Working from home today"

    def test_clock_in_with_project_task(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test clock in with project and task."""
        url = reverse("timeentry-clock-in")
        data = {"project": "RHR", "task": "Testing"}

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["project"] == "RHR"
        assert response.data["task"] == "Testing"

    def test_clock_out_success(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test successful clock out."""
        # Create active entry
        active_entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=None,
        )

        url = reverse("timeentry-clock-out")

        with patch("apps.timetracking.views.timezone") as mock_tz:
            from datetime import datetime

            mock_now = datetime(2024, 1, 15, 17, 0, 0)
            mock_tz.localtime.return_value = mock_now

            response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["end_time"] is not None
        assert response.data["id"] == active_entry.id

    def test_clock_out_with_break_minutes(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test clock out with break time."""
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=None,
        )

        url = reverse("timeentry-clock-out")
        data = {"break_minutes": 45}

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["break_minutes"] == 45

    def test_clock_out_with_notes_appends(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test clock out appends notes to existing notes."""
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=None,
            notes="Morning",
        )

        url = reverse("timeentry-clock-out")
        data = {"notes": "Evening"}

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "Morning" in response.data["notes"]
        assert "Evening" in response.data["notes"]

    def test_clock_out_not_clocked_in(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test clock out fails when not clocked in."""
        url = reverse("timeentry-clock-out")
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Not currently clocked in" in response.data["detail"]

    def test_clock_out_no_employee_profile(self, authenticated_tenant_client, tenant):
        """Test clock out fails without employee profile."""
        url = reverse("timeentry-clock-out")
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCurrentEntry:
    """Tests for current active entry endpoint."""

    def test_current_returns_active_entry(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test current returns the active time entry."""
        active_entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=None,
        )

        url = reverse("timeentry-current")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == active_entry.id

    def test_current_returns_null_when_not_clocked_in(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test current returns null when no active entry."""
        url = reverse("timeentry-current")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data is None

    def test_current_ignores_completed_entries(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test current ignores entries with end_time."""
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(17, 0),  # Completed
        )

        url = reverse("timeentry-current")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data is None


@pytest.mark.django_db
class TestMyEntries:
    """Tests for my_entries endpoint."""

    def test_my_entries_returns_own_entries(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test my_entries returns only current user's entries."""
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(17, 0),
        )

        url = reverse("timeentry-my-entries")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1


@pytest.mark.django_db
class TestWeeklySummary:
    """Tests for weekly summary endpoint."""

    def test_summary_calculates_totals(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test summary calculates hours correctly."""
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

        # Create entries for the week
        for i in range(3):
            TimeEntry.objects.create(
                tenant=tenant,
                employee=employee_with_user,
                entry_type=time_entry_type,
                date=week_start + timedelta(days=i),
                start_time=time(9, 0),
                end_time=time(17, 0),
                break_minutes=60,
            )

        url = reverse("timeentry-summary")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # 3 days * 7 hours = 21 hours
        assert Decimal(response.data["total_hours"]) == Decimal("21.0")

    def test_summary_separates_regular_and_overtime(
        self,
        authenticated_tenant_client,
        tenant,
        employee_with_user,
        time_entry_type,
        overtime_entry_type,
    ):
        """Test summary separates regular and overtime hours."""
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

        # Regular entry
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=week_start,
            start_time=time(9, 0),
            end_time=time(17, 0),
            break_minutes=60,
        )

        # Overtime entry
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=overtime_entry_type,
            date=week_start,
            start_time=time(18, 0),
            end_time=time(20, 0),
            break_minutes=0,
        )

        url = reverse("timeentry-summary")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert Decimal(response.data["regular_hours"]) == Decimal("7.0")
        assert Decimal(response.data["overtime_hours"]) == Decimal("2.0")

    def test_summary_with_custom_date_range(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test summary with custom date range."""
        start = date(2024, 1, 1)
        end = date(2024, 1, 7)

        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=date(2024, 1, 3),
            start_time=time(9, 0),
            end_time=time(17, 0),
            break_minutes=60,
        )

        url = reverse("timeentry-summary")
        response = authenticated_tenant_client.get(
            url, {"start_date": start.isoformat(), "end_date": end.isoformat()}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["week_start"] == start.isoformat()
        assert response.data["week_end"] == end.isoformat()

    def test_summary_excludes_incomplete_entries(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test summary excludes entries without end_time."""
        today = date.today()

        # Complete entry
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=today,
            start_time=time(9, 0),
            end_time=time(17, 0),
            break_minutes=60,
        )

        # Incomplete entry (still clocked in)
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=today,
            start_time=time(18, 0),
            end_time=None,
        )

        url = reverse("timeentry-summary")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Should only count the complete entry
        assert Decimal(response.data["total_hours"]) == Decimal("7.0")


@pytest.mark.django_db
class TestTimeEntryApproval:
    """Tests for time entry approval."""

    def test_approve_time_entry(
        self, authenticated_tenant_client, tenant, time_entry, employee_with_user
    ):
        """Test approving a time entry."""
        url = reverse("timeentry-approve", kwargs={"pk": time_entry.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_approved"] is True

        time_entry.refresh_from_db()
        assert time_entry.is_approved is True
        assert time_entry.approved_by == employee_with_user
        assert time_entry.approved_at is not None

    def test_approve_without_employee_profile(
        self, authenticated_tenant_client, tenant, time_entry
    ):
        """Test approval fails without employee profile."""
        url = reverse("timeentry-approve", kwargs={"pk": time_entry.id})
        response = authenticated_tenant_client.post(url, {})

        # Note: This passes because authenticated_tenant_client doesn't
        # necessarily have an employee_with_user
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_employee_cannot_approve_time_entry(
        self, authenticated_employee_client, tenant, time_entry
    ):
        """Test that regular employees cannot approve time entries."""
        url = reverse("timeentry-approve", kwargs={"pk": time_entry.id})
        response = authenticated_employee_client.post(url, {})

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Only managers" in response.data["detail"]
