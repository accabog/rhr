"""
Tests for timesheets views.
"""

from datetime import date, time, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from apps.timetracking.models import TimeEntry, TimeEntryType
from apps.timesheets.models import Timesheet, TimesheetComment


@pytest.mark.django_db
class TestTimesheetViewSet:
    """Tests for Timesheet API endpoints."""

    def test_list_timesheets(self, authenticated_tenant_client, tenant, timesheet):
        """Test listing timesheets."""
        url = reverse("timesheet-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) >= 1

    def test_list_timesheets_filtered_by_status(
        self, authenticated_tenant_client, tenant, employee, timesheet
    ):
        """Test filtering timesheets by status."""
        # Create submitted timesheet
        Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=date.today() - timedelta(days=28),
            period_end=date.today() - timedelta(days=15),
            status="submitted",
        )

        url = reverse("timesheet-list")
        response = authenticated_tenant_client.get(url, {"status": "draft"})

        assert response.status_code == status.HTTP_200_OK
        for ts in response.data["results"]:
            assert ts["status"] == "draft"

    def test_retrieve_timesheet(self, authenticated_tenant_client, tenant, timesheet):
        """Test retrieving a single timesheet."""
        url = reverse("timesheet-detail", kwargs={"pk": timesheet.id})
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == timesheet.id

    def test_timesheets_filtered_by_tenant(
        self, authenticated_tenant_client, tenant, tenant2, timesheet, employee2
    ):
        """Test only current tenant's timesheets are returned."""
        # Create timesheet in tenant2
        Timesheet.objects.create(
            tenant=tenant2,
            employee=employee2,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
        )

        url = reverse("timesheet-list")
        response = authenticated_tenant_client.get(url)

        for ts in response.data["results"]:
            assert ts["id"] != employee2.id


@pytest.mark.django_db
class TestTimesheetGenerate:
    """Tests for timesheet generation."""

    def test_generate_timesheet_from_entries(
        self,
        authenticated_tenant_client,
        tenant,
        employee_with_user,
        time_entry_type,
    ):
        """Test generating a timesheet from time entries."""
        period_start = date.today() - timedelta(days=7)
        period_end = date.today() - timedelta(days=1)

        # Create time entries for the period
        for i in range(5):
            TimeEntry.objects.create(
                tenant=tenant,
                employee=employee_with_user,
                entry_type=time_entry_type,
                date=period_start + timedelta(days=i),
                start_time=time(9, 0),
                end_time=time(17, 0),
                break_minutes=60,
            )

        url = reverse("timesheet-generate")
        data = {
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "draft"
        # 5 days * 7 hours = 35 hours
        assert Decimal(response.data["total_regular_hours"]) == Decimal("35.0")

    def test_generate_with_overtime(
        self,
        authenticated_tenant_client,
        tenant,
        employee_with_user,
        time_entry_type,
        overtime_entry_type,
    ):
        """Test generation includes overtime hours separately."""
        period_start = date.today() - timedelta(days=7)
        period_end = date.today() - timedelta(days=1)

        # Regular entry
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=period_start,
            start_time=time(9, 0),
            end_time=time(17, 0),
            break_minutes=60,
        )

        # Overtime entry
        TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=overtime_entry_type,
            date=period_start,
            start_time=time(18, 0),
            end_time=time(20, 0),
            break_minutes=0,
        )

        url = reverse("timesheet-generate")
        data = {
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Decimal(response.data["total_regular_hours"]) == Decimal("7.0")
        assert Decimal(response.data["total_overtime_hours"]) == Decimal("2.0")

    def test_generate_fails_if_already_exists(
        self, authenticated_tenant_client, tenant, employee_with_user, timesheet
    ):
        """Test generation fails if timesheet exists for period."""
        # Update timesheet to use employee_with_user
        timesheet.employee = employee_with_user
        timesheet.save()

        url = reverse("timesheet-generate")
        data = {
            "period_start": timesheet.period_start.isoformat(),
            "period_end": timesheet.period_end.isoformat(),
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.data["detail"]

    def test_generate_for_specific_employee(
        self, authenticated_tenant_client, tenant, employee, employee_with_user
    ):
        """Test admin can generate timesheet for specific employee."""
        period_start = date.today() - timedelta(days=7)
        period_end = date.today() - timedelta(days=1)

        url = reverse("timesheet-generate")
        data = {
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "employee_id": employee.id,
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["employee"] == employee.id


@pytest.mark.django_db
class TestTimesheetWorkflow:
    """Tests for timesheet workflow (submit, approve, reject, reopen)."""

    def test_submit_draft_timesheet(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test submitting a draft timesheet."""
        timesheet = Timesheet.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="draft",
            total_regular_hours=Decimal("80.0"),
        )

        url = reverse("timesheet-submit", kwargs={"pk": timesheet.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "submitted"

        timesheet.refresh_from_db()
        assert timesheet.status == "submitted"
        assert timesheet.submitted_at is not None

    def test_submit_with_notes(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test submitting with notes creates a comment."""
        timesheet = Timesheet.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="draft",
        )

        url = reverse("timesheet-submit", kwargs={"pk": timesheet.id})
        data = {"notes": "Please approve ASAP"}

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK

        # Check comment was created
        comments = TimesheetComment.objects.filter(timesheet=timesheet)
        assert comments.count() == 1
        assert "Please approve ASAP" in comments.first().content

    def test_cannot_submit_non_draft(
        self, authenticated_tenant_client, tenant, submitted_timesheet
    ):
        """Test cannot submit a non-draft timesheet."""
        url = reverse("timesheet-submit", kwargs={"pk": submitted_timesheet.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot submit" in response.data["detail"]

    def test_approve_submitted_timesheet(
        self, authenticated_tenant_client, tenant, employee_with_user, time_entry_type
    ):
        """Test approving a submitted timesheet."""
        timesheet = Timesheet.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="submitted",
        )

        # Create time entries that will be approved
        entry = TimeEntry.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            entry_type=time_entry_type,
            date=date.today() - timedelta(days=7),
            start_time=time(9, 0),
            end_time=time(17, 0),
            is_approved=False,
        )

        url = reverse("timesheet-approve", kwargs={"pk": timesheet.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "approved"

        timesheet.refresh_from_db()
        assert timesheet.status == "approved"
        assert timesheet.approved_by is not None
        assert timesheet.approved_at is not None

        # Check time entries were also approved
        entry.refresh_from_db()
        assert entry.is_approved is True

    def test_cannot_approve_non_submitted(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test cannot approve a non-submitted timesheet."""
        # Create a draft timesheet
        timesheet = Timesheet.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="draft",
        )

        url = reverse("timesheet-approve", kwargs={"pk": timesheet.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only submitted" in response.data["detail"]

    def test_reject_submitted_timesheet(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test rejecting a submitted timesheet."""
        timesheet = Timesheet.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="submitted",
        )

        url = reverse("timesheet-reject", kwargs={"pk": timesheet.id})
        data = {"reason": "Missing project codes for Monday"}

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "rejected"
        assert response.data["rejection_reason"] == "Missing project codes for Monday"

        # Check rejection comment was created
        comments = TimesheetComment.objects.filter(timesheet=timesheet)
        assert comments.count() == 1
        assert "Rejected" in comments.first().content

    def test_reject_requires_reason(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test rejection requires a reason."""
        # Create a submitted timesheet
        timesheet = Timesheet.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="submitted",
        )

        url = reverse("timesheet-reject", kwargs={"pk": timesheet.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reopen_rejected_timesheet(
        self, authenticated_tenant_client, tenant, employee
    ):
        """Test reopening a rejected timesheet."""
        timesheet = Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="rejected",
            rejection_reason="Fix entries",
        )

        url = reverse("timesheet-reopen", kwargs={"pk": timesheet.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "draft"
        assert response.data["rejection_reason"] == ""

    def test_cannot_reopen_non_rejected(
        self, authenticated_tenant_client, tenant, timesheet
    ):
        """Test cannot reopen a non-rejected timesheet."""
        url = reverse("timesheet-reopen", kwargs={"pk": timesheet.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only rejected" in response.data["detail"]


@pytest.mark.django_db
class TestTimesheetComments:
    """Tests for timesheet comments."""

    def test_get_comments(
        self, authenticated_tenant_client, tenant, timesheet, employee
    ):
        """Test getting timesheet comments."""
        TimesheetComment.objects.create(
            tenant=tenant,
            timesheet=timesheet,
            author=employee,
            content="First comment",
        )

        url = reverse("timesheet-comments", kwargs={"pk": timesheet.id})
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["content"] == "First comment"

    def test_add_comment(
        self, authenticated_tenant_client, tenant, timesheet, employee_with_user
    ):
        """Test adding a comment to a timesheet."""
        url = reverse("timesheet-comments", kwargs={"pk": timesheet.id})
        data = {"content": "New comment from user"}

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["content"] == "New comment from user"


@pytest.mark.django_db
class TestMyTimesheets:
    """Tests for my_timesheets endpoint."""

    def test_my_timesheets_returns_own(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test my_timesheets returns only current user's timesheets."""
        ts = Timesheet.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
        )

        url = reverse("timesheet-my-timesheets")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == ts.id

    def test_my_timesheets_with_status_filter(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test filtering my_timesheets by status."""
        Timesheet.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="draft",
        )
        Timesheet.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            period_start=date.today() - timedelta(days=28),
            period_end=date.today() - timedelta(days=15),
            status="submitted",
        )

        url = reverse("timesheet-my-timesheets")
        response = authenticated_tenant_client.get(url, {"status": "draft"})

        assert response.status_code == status.HTTP_200_OK
        for ts in response.data["results"]:
            assert ts["status"] == "draft"


@pytest.mark.django_db
class TestPendingApproval:
    """Tests for pending_approval endpoint."""

    def test_pending_approval_returns_submitted(
        self, authenticated_tenant_client, tenant, employee, employee_with_user
    ):
        """Test pending_approval returns submitted timesheets."""
        ts = Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="submitted",
        )

        # Also create a draft one that shouldn't appear
        Timesheet.objects.create(
            tenant=tenant,
            employee=employee,
            period_start=date.today() - timedelta(days=28),
            period_end=date.today() - timedelta(days=15),
            status="draft",
        )

        url = reverse("timesheet-pending-approval")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == ts.id
