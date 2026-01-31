"""
Tests for leave views.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from apps.leave.models import Holiday, LeaveBalance, LeaveRequest


@pytest.mark.django_db
class TestLeaveTypeViewSet:
    """Tests for LeaveType API endpoints."""

    def test_list_leave_types(self, authenticated_tenant_client, tenant, leave_type):
        """Test listing leave types."""
        url = reverse("leavetype-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert any(lt["code"] == "ANNUAL" for lt in response.data)

    def test_create_leave_type(self, authenticated_tenant_client, tenant):
        """Test creating a leave type."""
        url = reverse("leavetype-list")
        data = {
            "name": "Personal Leave",
            "code": "PERSONAL",
            "is_paid": False,
            "requires_approval": True,
            "color": "#8b5cf6",
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Personal Leave"


@pytest.mark.django_db
class TestLeaveBalanceViewSet:
    """Tests for LeaveBalance API endpoints."""

    def test_list_balances(
        self, authenticated_tenant_client, tenant, leave_balance
    ):
        """Test listing leave balances."""
        url = reverse("leavebalance-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data

    def test_my_balances(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test getting current user's balances."""
        LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            year=date.today().year,
            entitled_days=Decimal("20.0"),
            used_days=Decimal("5.0"),
        )

        url = reverse("leavebalance-my-balances")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_my_balances_filter_by_year(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test filtering my_balances by year."""
        # Create balances for multiple years
        LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            year=2024,
            entitled_days=Decimal("20.0"),
        )
        LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            year=2023,
            entitled_days=Decimal("18.0"),
        )

        url = reverse("leavebalance-my-balances")
        response = authenticated_tenant_client.get(url, {"year": 2024})

        assert response.status_code == status.HTTP_200_OK
        for bal in response.data:
            assert bal["year"] == 2024

    def test_summary_includes_pending(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test summary includes pending leave requests."""
        LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            year=date.today().year,
            entitled_days=Decimal("20.0"),
            used_days=Decimal("5.0"),
        )

        # Create pending request
        LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),  # 3 days
            status="pending",
        )

        url = reverse("leavebalance-summary")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        # Should include pending_days
        for item in response.data:
            if item["leave_type_id"] == leave_type.id:
                assert "pending_days" in item


@pytest.mark.django_db
class TestLeaveRequestViewSet:
    """Tests for LeaveRequest API endpoints."""

    def test_list_leave_requests(
        self, authenticated_tenant_client, tenant, leave_request
    ):
        """Test listing leave requests."""
        url = reverse("leaverequest-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data

    def test_create_leave_request(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test creating a leave request."""
        url = reverse("leaverequest-list")
        data = {
            "leave_type": leave_type.id,
            "start_date": (date.today() + timedelta(days=14)).isoformat(),
            "end_date": (date.today() + timedelta(days=16)).isoformat(),
            "reason": "Family vacation",
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "pending"
        assert response.data["reason"] == "Family vacation"

    def test_create_half_day_request(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test creating a half-day leave request."""
        url = reverse("leaverequest-list")
        data = {
            "leave_type": leave_type.id,
            "start_date": (date.today() + timedelta(days=14)).isoformat(),
            "end_date": (date.today() + timedelta(days=14)).isoformat(),
            "is_half_day": True,
            "half_day_period": "morning",
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["is_half_day"] is True
        assert response.data["half_day_period"] == "morning"


@pytest.mark.django_db
class TestLeaveRequestWorkflow:
    """Tests for leave request workflow (approve, reject, cancel)."""

    def test_approve_request(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test approving a leave request updates balance."""
        # Create balance
        balance = LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            year=date.today().year,
            entitled_days=Decimal("20.0"),
            used_days=Decimal("0.0"),
        )

        # Create request
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),  # 3 days
            status="pending",
        )

        url = reverse("leaverequest-approve", kwargs={"pk": request.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "approved"

        # Check balance was updated
        balance.refresh_from_db()
        assert balance.used_days == Decimal("3.0")

    def test_approve_with_notes(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test approving with reviewer notes."""
        LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            year=date.today().year,
            entitled_days=Decimal("20.0"),
        )

        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="pending",
        )

        url = reverse("leaverequest-approve", kwargs={"pk": request.id})
        data = {"notes": "Enjoy your vacation!"}

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["review_notes"] == "Enjoy your vacation!"

    def test_cannot_approve_non_pending(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test cannot approve non-pending request."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="approved",  # Already approved
        )

        url = reverse("leaverequest-approve", kwargs={"pk": request.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only pending" in response.data["detail"]

    def test_reject_request(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test rejecting a leave request."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="pending",
        )

        url = reverse("leaverequest-reject", kwargs={"pk": request.id})
        data = {"notes": "Team deadline conflict"}

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "rejected"

    def test_cancel_own_pending_request(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test cancelling own pending request."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="pending",
        )

        url = reverse("leaverequest-cancel", kwargs={"pk": request.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "cancelled"

    def test_cancel_approved_request_restores_balance(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test cancelling approved request restores balance."""
        balance = LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            year=date.today().year,
            entitled_days=Decimal("20.0"),
            used_days=Decimal("3.0"),  # Already used 3 days
        )

        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),  # 3 days
            status="approved",
        )

        url = reverse("leaverequest-cancel", kwargs={"pk": request.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK

        # Balance should be restored
        balance.refresh_from_db()
        assert balance.used_days == Decimal("0.0")

    def test_cannot_cancel_others_request(
        self, authenticated_tenant_client, tenant, employee, employee_with_user, leave_type
    ):
        """Test cannot cancel another employee's request."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,  # Different employee
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="pending",
        )

        url = reverse("leaverequest-cancel", kwargs={"pk": request.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "only cancel your own" in response.data["detail"]

    def test_cannot_cancel_rejected_request(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test cannot cancel a rejected request."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="rejected",
        )

        url = reverse("leaverequest-cancel", kwargs={"pk": request.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "cannot be cancelled" in response.data["detail"]


@pytest.mark.django_db
class TestMyRequests:
    """Tests for my_requests endpoint."""

    def test_my_requests_returns_own(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test my_requests returns only current user's requests."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
        )

        url = reverse("leaverequest-my-requests")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == request.id


@pytest.mark.django_db
class TestPendingApproval:
    """Tests for pending_approval endpoint."""

    def test_pending_approval_returns_pending(
        self, authenticated_tenant_client, tenant, employee, leave_type
    ):
        """Test pending_approval returns pending requests."""
        pending = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="pending",
        )

        # Also create approved (shouldn't appear)
        LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=14),
            end_date=date.today() + timedelta(days=16),
            status="approved",
        )

        url = reverse("leaverequest-pending-approval")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == pending.id

    def test_pending_approval_forbidden_for_employees(
        self, authenticated_employee_client, tenant, employee, leave_type
    ):
        """Test that regular employees cannot view pending approvals."""
        LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="pending",
        )

        url = reverse("leaverequest-pending-approval")
        response = authenticated_employee_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Only managers" in response.data["detail"]


@pytest.mark.django_db
class TestApprovalAuthorization:
    """Tests for leave approval authorization."""

    def test_employee_cannot_approve_request(
        self, authenticated_employee_client, tenant, employee, leave_type
    ):
        """Test that regular employees cannot approve leave requests."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="pending",
        )

        url = reverse("leaverequest-approve", kwargs={"pk": request.id})
        response = authenticated_employee_client.post(url, {})

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Only managers" in response.data["detail"]

        # Verify request was not approved
        request.refresh_from_db()
        assert request.status == "pending"

    def test_employee_cannot_reject_request(
        self, authenticated_employee_client, tenant, employee, leave_type
    ):
        """Test that regular employees cannot reject leave requests."""
        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="pending",
        )

        url = reverse("leaverequest-reject", kwargs={"pk": request.id})
        response = authenticated_employee_client.post(url, {"notes": "Denied"})

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Only managers" in response.data["detail"]

        # Verify request was not rejected
        request.refresh_from_db()
        assert request.status == "pending"

    def test_manager_can_approve_request(
        self, authenticated_tenant_client, tenant, employee_with_user, leave_type
    ):
        """Test that managers/owners can approve leave requests."""
        LeaveBalance.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            year=date.today().year,
            entitled_days=Decimal("20.0"),
        )

        request = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            leave_type=leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="pending",
        )

        url = reverse("leaverequest-approve", kwargs={"pk": request.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "approved"


@pytest.mark.django_db
class TestCalendar:
    """Tests for calendar endpoint."""

    def test_calendar_returns_approved_and_pending(
        self, authenticated_tenant_client, tenant, employee, leave_type
    ):
        """Test calendar returns approved and pending requests."""
        start = date.today()
        end = date.today() + timedelta(days=30)

        approved = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=start + timedelta(days=5),
            end_date=start + timedelta(days=7),
            status="approved",
        )
        pending = LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=start + timedelta(days=15),
            end_date=start + timedelta(days=17),
            status="pending",
        )
        # Rejected shouldn't appear
        LeaveRequest.objects.create(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            start_date=start + timedelta(days=20),
            end_date=start + timedelta(days=22),
            status="rejected",
        )

        url = reverse("leaverequest-calendar")
        response = authenticated_tenant_client.get(
            url, {"start_date": start.isoformat(), "end_date": end.isoformat()}
        )

        assert response.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in response.data]
        assert approved.id in ids
        assert pending.id in ids
        assert len(response.data) == 2

    def test_calendar_requires_dates(self, authenticated_tenant_client, tenant):
        """Test calendar requires date parameters."""
        url = reverse("leaverequest-calendar")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "required" in response.data["detail"]


@pytest.mark.django_db
class TestHolidayViewSet:
    """Tests for Holiday API endpoints."""

    def test_list_holidays(self, authenticated_tenant_client, tenant):
        """Test listing holidays."""
        Holiday.objects.create(
            tenant=tenant,
            name="New Year",
            date=date(date.today().year, 1, 1),
        )

        url = reverse("holiday-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_filter_holidays_by_year(self, authenticated_tenant_client, tenant):
        """Test filtering holidays by year."""
        Holiday.objects.create(
            tenant=tenant,
            name="Christmas 2024",
            date=date(2024, 12, 25),
        )
        Holiday.objects.create(
            tenant=tenant,
            name="Christmas 2025",
            date=date(2025, 12, 25),
        )

        url = reverse("holiday-list")
        response = authenticated_tenant_client.get(url, {"year": 2024})

        assert response.status_code == status.HTTP_200_OK
        for holiday in response.data:
            assert "2024" in holiday["date"]

    def test_upcoming_holidays(self, authenticated_tenant_client, tenant):
        """Test upcoming holidays endpoint."""
        today = date.today()

        # Upcoming
        Holiday.objects.create(
            tenant=tenant,
            name="Future Holiday",
            date=today + timedelta(days=10),
        )
        # Past (shouldn't appear)
        Holiday.objects.create(
            tenant=tenant,
            name="Past Holiday",
            date=today - timedelta(days=10),
        )

        url = reverse("holiday-upcoming")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        for holiday in response.data:
            assert date.fromisoformat(holiday["date"]) >= today
