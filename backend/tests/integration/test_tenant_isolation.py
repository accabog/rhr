"""
Integration tests for tenant isolation.

These tests verify that users cannot access data from other tenants,
which is critical for the multi-tenant security model.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from apps.contracts.models import Contract, ContractType
from apps.employees.models import Department, Employee, Position
from apps.leave.models import LeaveBalance, LeaveRequest, LeaveType
from apps.tenants.models import TenantMembership
from apps.timetracking.models import TimeEntry, TimeEntryType
from apps.timesheets.models import Timesheet


@pytest.mark.django_db
class TestEmployeeTenantIsolation:
    """Tests for employee data tenant isolation."""

    def test_cannot_list_other_tenant_employees(
        self, authenticated_tenant_client, tenant, employee, employee2, tenant2
    ):
        """Test user cannot see employees from other tenants."""
        url = reverse("employee-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        employee_ids = [e["id"] for e in response.data["results"]]
        assert employee.id in employee_ids
        assert employee2.id not in employee_ids

    def test_cannot_retrieve_other_tenant_employee(
        self, authenticated_tenant_client, tenant, employee2
    ):
        """Test user cannot retrieve an employee from another tenant."""
        url = reverse("employee-detail", kwargs={"pk": employee2.id})
        response = authenticated_tenant_client.get(url)

        # Should return 404, not 403, to avoid information leakage
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_update_other_tenant_employee(
        self, authenticated_tenant_client, tenant, employee2
    ):
        """Test user cannot update an employee from another tenant."""
        url = reverse("employee-detail", kwargs={"pk": employee2.id})
        data = {"first_name": "Hacked"}

        response = authenticated_tenant_client.patch(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_delete_other_tenant_employee(
        self, authenticated_tenant_client, tenant, employee2
    ):
        """Test user cannot delete an employee from another tenant."""
        url = reverse("employee-detail", kwargs={"pk": employee2.id})
        response = authenticated_tenant_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        # Employee should still exist
        assert Employee.objects.filter(pk=employee2.id).exists()


@pytest.mark.django_db
class TestDepartmentTenantIsolation:
    """Tests for department data tenant isolation."""

    def test_cannot_list_other_tenant_departments(
        self, authenticated_tenant_client, tenant, department, tenant2
    ):
        """Test user cannot see departments from other tenants."""
        # Create department in tenant2
        other_dept = Department.objects.create(
            tenant=tenant2,
            name="Other Dept",
            code="OTHER",
        )

        url = reverse("department-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        dept_ids = [d["id"] for d in response.data["results"]]
        assert department.id in dept_ids
        assert other_dept.id not in dept_ids


@pytest.mark.django_db
class TestTimeEntryTenantIsolation:
    """Tests for time entry data tenant isolation."""

    def test_cannot_list_other_tenant_time_entries(
        self, authenticated_tenant_client, tenant, time_entry, tenant2, employee2
    ):
        """Test user cannot see time entries from other tenants."""
        # Create time entry in tenant2
        entry_type = TimeEntryType.objects.create(
            tenant=tenant2,
            name="Regular",
            code="REG",
        )
        other_entry = TimeEntry.objects.create(
            tenant=tenant2,
            employee=employee2,
            entry_type=entry_type,
            date=date.today(),
            start_time="09:00",
            end_time="17:00",
        )

        url = reverse("timeentry-list")
        response = authenticated_tenant_client.get(url)

        entry_ids = [e["id"] for e in response.data["results"]]
        assert time_entry.id in entry_ids
        assert other_entry.id not in entry_ids


@pytest.mark.django_db
class TestTimesheetTenantIsolation:
    """Tests for timesheet data tenant isolation."""

    def test_cannot_list_other_tenant_timesheets(
        self, authenticated_tenant_client, tenant, timesheet, tenant2, employee2
    ):
        """Test user cannot see timesheets from other tenants."""
        other_ts = Timesheet.objects.create(
            tenant=tenant2,
            employee=employee2,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
        )

        url = reverse("timesheet-list")
        response = authenticated_tenant_client.get(url)

        ts_ids = [t["id"] for t in response.data["results"]]
        assert timesheet.id in ts_ids
        assert other_ts.id not in ts_ids

    def test_cannot_approve_other_tenant_timesheet(
        self, authenticated_tenant_client, tenant, tenant2, employee2
    ):
        """Test user cannot approve a timesheet from another tenant."""
        other_ts = Timesheet.objects.create(
            tenant=tenant2,
            employee=employee2,
            period_start=date.today() - timedelta(days=14),
            period_end=date.today() - timedelta(days=1),
            status="submitted",
        )

        url = reverse("timesheet-approve", kwargs={"pk": other_ts.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestLeaveRequestTenantIsolation:
    """Tests for leave request data tenant isolation."""

    def test_cannot_list_other_tenant_leave_requests(
        self, authenticated_tenant_client, tenant, leave_request, tenant2, employee2
    ):
        """Test user cannot see leave requests from other tenants."""
        other_leave_type = LeaveType.objects.create(
            tenant=tenant2,
            name="Annual",
            code="ANNUAL",
        )
        other_request = LeaveRequest.objects.create(
            tenant=tenant2,
            employee=employee2,
            leave_type=other_leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
        )

        url = reverse("leaverequest-list")
        response = authenticated_tenant_client.get(url)

        request_ids = [r["id"] for r in response.data["results"]]
        assert leave_request.id in request_ids
        assert other_request.id not in request_ids

    def test_cannot_approve_other_tenant_leave_request(
        self, authenticated_tenant_client, tenant, tenant2, employee2
    ):
        """Test user cannot approve a leave request from another tenant."""
        other_leave_type = LeaveType.objects.create(
            tenant=tenant2,
            name="Annual",
            code="ANNUAL",
        )
        other_request = LeaveRequest.objects.create(
            tenant=tenant2,
            employee=employee2,
            leave_type=other_leave_type,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            status="pending",
        )

        url = reverse("leaverequest-approve", kwargs={"pk": other_request.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestContractTenantIsolation:
    """Tests for contract data tenant isolation."""

    def test_cannot_list_other_tenant_contracts(
        self, authenticated_tenant_client, tenant, contract, tenant2, employee2
    ):
        """Test user cannot see contracts from other tenants."""
        other_ct = ContractType.objects.create(
            tenant=tenant2,
            name="Full-time",
            code="FT",
        )
        other_contract = Contract.objects.create(
            tenant=tenant2,
            employee=employee2,
            contract_type=other_ct,
            title="Other Contract",
            start_date=date.today(),
        )

        url = reverse("contract-list")
        response = authenticated_tenant_client.get(url)

        contract_ids = [c["id"] for c in response.data["results"]]
        assert contract.id in contract_ids
        assert other_contract.id not in contract_ids


@pytest.mark.django_db
class TestCrossTenantQueries:
    """Tests for cross-tenant query attempts."""

    def test_filtered_queryset_returns_empty_not_forbidden(
        self, authenticated_tenant_client, tenant, tenant2, employee2
    ):
        """Test cross-tenant queries return empty, not forbidden."""
        # Try to filter by an employee from another tenant
        url = reverse("timeentry-list")
        response = authenticated_tenant_client.get(
            url, {"employee": employee2.id}
        )

        # Should return 200 with empty results, not 403
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0

    def test_cannot_create_with_other_tenant_foreign_key(
        self, authenticated_tenant_client, tenant, tenant2, employee2, time_entry_type
    ):
        """Test cannot create records with foreign keys from other tenant."""
        url = reverse("timeentry-list")
        data = {
            "employee": employee2.id,  # Employee from another tenant
            "entry_type": time_entry_type.id,
            "date": date.today().isoformat(),
            "start_time": "09:00:00",
            "end_time": "17:00:00",
        }

        response = authenticated_tenant_client.post(url, data)

        # Should fail validation - employee not found in tenant
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_403_FORBIDDEN,
        ]


@pytest.mark.django_db
class TestTenantSwitching:
    """Tests for tenant switching behavior."""

    def test_user_sees_correct_data_per_tenant(
        self, api_client, user, tenant, tenant2
    ):
        """Test user sees different data when switching tenants."""
        # User is member of both tenants
        TenantMembership.objects.create(
            user=user, tenant=tenant, role="admin"
        )
        TenantMembership.objects.create(
            user=user, tenant=tenant2, role="admin"
        )

        # Create departments in each tenant
        dept1 = Department.objects.create(
            tenant=tenant,
            name="Tenant 1 Dept",
            code="T1",
        )
        dept2 = Department.objects.create(
            tenant=tenant2,
            name="Tenant 2 Dept",
            code="T2",
        )

        api_client.force_authenticate(user=user)

        # Request with tenant 1 header
        api_client.credentials(HTTP_X_TENANT_ID=str(tenant.id))
        url = reverse("department-list")
        response = api_client.get(url)

        dept_names = [d["name"] for d in response.data["results"]]
        assert "Tenant 1 Dept" in dept_names
        assert "Tenant 2 Dept" not in dept_names

        # Switch to tenant 2
        api_client.credentials(HTTP_X_TENANT_ID=str(tenant2.id))
        response = api_client.get(url)

        dept_names = [d["name"] for d in response.data["results"]]
        assert "Tenant 2 Dept" in dept_names
        assert "Tenant 1 Dept" not in dept_names


@pytest.mark.django_db
class TestTenantAwareManager:
    """Tests for TenantAwareManager functionality."""

    def test_for_tenant_filters_correctly(self, tenant, tenant2, department):
        """Test for_tenant() method filters correctly."""
        # Create department in tenant2
        other_dept = Department.objects.create(
            tenant=tenant2,
            name="Other Dept",
            code="OTHER",
        )

        tenant_depts = Department.objects.for_tenant(tenant)
        other_tenant_depts = Department.objects.for_tenant(tenant2)

        assert department in tenant_depts
        assert department not in other_tenant_depts
        assert other_dept in other_tenant_depts
        assert other_dept not in tenant_depts
