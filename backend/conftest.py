"""
Pytest configuration and fixtures for RHR backend tests.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


# ============================================================================
# User Fixtures
# ============================================================================


@pytest.fixture
def api_client():
    """Return an unauthenticated API client."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create and return a test user."""
    return User.objects.create_user(
        email="test@example.com",
        password="testpass123",
        first_name="Test",
        last_name="User",
    )


@pytest.fixture
def user2(db):
    """Create a second test user for isolation tests."""
    return User.objects.create_user(
        email="test2@example.com",
        password="testpass123",
        first_name="Second",
        last_name="User",
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


# ============================================================================
# Tenant Fixtures
# ============================================================================


@pytest.fixture
def tenant(db):
    """Create and return a test tenant."""
    from apps.tenants.models import Tenant

    return Tenant.objects.create(
        name="Test Company",
        slug="test-company",
    )


@pytest.fixture
def tenant2(db):
    """Create a second tenant for isolation tests."""
    from apps.tenants.models import Tenant

    return Tenant.objects.create(
        name="Other Company",
        slug="other-company",
    )


@pytest.fixture
def tenant_membership(db, user, tenant):
    """Create a tenant membership for the test user."""
    from apps.tenants.models import TenantMembership

    return TenantMembership.objects.create(
        user=user,
        tenant=tenant,
        role="owner",
        is_default=True,
    )


@pytest.fixture
def tenant_membership_admin(db, user, tenant):
    """Create an admin-role tenant membership."""
    from apps.tenants.models import TenantMembership

    return TenantMembership.objects.create(
        user=user,
        tenant=tenant,
        role="admin",
        is_default=True,
    )


@pytest.fixture
def tenant_membership2(db, user2, tenant2):
    """Create membership for user2 in tenant2."""
    from apps.tenants.models import TenantMembership

    return TenantMembership.objects.create(
        user=user2,
        tenant=tenant2,
        role="owner",
        is_default=True,
    )


@pytest.fixture
def tenant_settings(db, tenant):
    """Create tenant settings."""
    from apps.tenants.models import TenantSettings

    return TenantSettings.objects.create(
        tenant=tenant,
        work_hours_per_day=8.0,
        work_days_per_week=5,
        default_annual_leave_days=20,
        default_sick_leave_days=10,
    )


@pytest.fixture
def authenticated_tenant_client(api_client, user, tenant, tenant_membership):
    """Return an authenticated API client with X-Tenant-ID header."""
    api_client.force_authenticate(user=user)
    api_client.credentials(HTTP_X_TENANT_ID=str(tenant.id))
    return api_client


@pytest.fixture
def tenant_membership_employee(db, user, tenant):
    """Create a regular employee-role tenant membership (no approval permissions)."""
    from apps.tenants.models import TenantMembership

    return TenantMembership.objects.create(
        user=user,
        tenant=tenant,
        role="employee",
        is_default=True,
    )


@pytest.fixture
def authenticated_employee_client(api_client, user, tenant, tenant_membership_employee):
    """Return an authenticated API client with employee role (no approval permissions)."""
    api_client.force_authenticate(user=user)
    api_client.credentials(HTTP_X_TENANT_ID=str(tenant.id))
    return api_client


# ============================================================================
# Organization Fixtures (Department, Position)
# ============================================================================


@pytest.fixture
def department(db, tenant):
    """Create a test department."""
    from apps.employees.models import Department

    return Department.objects.create(
        tenant=tenant,
        name="Engineering",
        code="ENG",
        description="Engineering department",
        is_active=True,
    )


@pytest.fixture
def department2(db, tenant):
    """Create a second department."""
    from apps.employees.models import Department

    return Department.objects.create(
        tenant=tenant,
        name="Human Resources",
        code="HR",
        description="HR department",
        is_active=True,
    )


@pytest.fixture
def child_department(db, tenant, department):
    """Create a child department under the main department."""
    from apps.employees.models import Department

    return Department.objects.create(
        tenant=tenant,
        name="Backend Team",
        code="ENG-BE",
        description="Backend engineering team",
        parent=department,
        is_active=True,
    )


@pytest.fixture
def position(db, tenant, department):
    """Create a test position."""
    from apps.employees.models import Position

    return Position.objects.create(
        tenant=tenant,
        title="Software Engineer",
        code="SWE",
        department=department,
        level=3,
        is_active=True,
    )


@pytest.fixture
def manager_position(db, tenant, department):
    """Create a manager position."""
    from apps.employees.models import Position

    return Position.objects.create(
        tenant=tenant,
        title="Engineering Manager",
        code="EM",
        department=department,
        level=5,
        is_active=True,
    )


# ============================================================================
# Employee Fixtures
# ============================================================================


@pytest.fixture
def employee(db, tenant, department, position):
    """Create a test employee without user account."""
    from datetime import date

    from apps.employees.models import Employee

    return Employee.objects.create(
        tenant=tenant,
        employee_id="EMP-001",
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        department=department,
        position=position,
        hire_date=date(2023, 1, 15),
        status="active",
    )


@pytest.fixture
def employee_with_user(db, user, tenant, tenant_membership, department, position):
    """Create an employee linked to a user account."""
    from datetime import date

    from apps.employees.models import Employee

    return Employee.objects.create(
        tenant=tenant,
        user=user,
        employee_id="EMP-002",
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        department=department,
        position=position,
        hire_date=date(2023, 1, 15),
        status="active",
    )


@pytest.fixture
def manager_employee(db, tenant, department, manager_position):
    """Create a manager employee."""
    from datetime import date

    from apps.employees.models import Employee

    return Employee.objects.create(
        tenant=tenant,
        employee_id="EMP-MGR",
        first_name="Jane",
        last_name="Manager",
        email="jane.manager@example.com",
        department=department,
        position=manager_position,
        hire_date=date(2022, 1, 1),
        status="active",
    )


@pytest.fixture
def employee2(db, tenant2):
    """Create an employee in tenant2 for isolation tests."""
    from datetime import date

    from apps.employees.models import Department, Employee, Position

    dept = Department.objects.create(
        tenant=tenant2,
        name="Sales",
        code="SALES",
    )
    pos = Position.objects.create(
        tenant=tenant2,
        title="Sales Rep",
        code="SR",
        department=dept,
    )
    return Employee.objects.create(
        tenant=tenant2,
        employee_id="EMP2-001",
        first_name="Alice",
        last_name="Other",
        email="alice@other.com",
        department=dept,
        position=pos,
        hire_date=date(2023, 6, 1),
        status="active",
    )


# ============================================================================
# Time Tracking Fixtures
# ============================================================================


@pytest.fixture
def time_entry_type(db, tenant):
    """Create a regular time entry type."""
    from apps.timetracking.models import TimeEntryType

    return TimeEntryType.objects.create(
        tenant=tenant,
        name="Regular",
        code="REG",
        is_paid=True,
        multiplier=1.0,
        color="#3b82f6",
        is_active=True,
    )


@pytest.fixture
def overtime_entry_type(db, tenant):
    """Create an overtime time entry type."""
    from apps.timetracking.models import TimeEntryType

    return TimeEntryType.objects.create(
        tenant=tenant,
        name="Overtime",
        code="OT",
        is_paid=True,
        multiplier=1.5,
        color="#f59e0b",
        is_active=True,
    )


@pytest.fixture
def time_entry(db, tenant, employee, time_entry_type):
    """Create a completed time entry."""
    from datetime import date, time

    from apps.timetracking.models import TimeEntry

    return TimeEntry.objects.create(
        tenant=tenant,
        employee=employee,
        entry_type=time_entry_type,
        date=date.today(),
        start_time=time(9, 0),
        end_time=time(17, 0),
        break_minutes=60,
    )


@pytest.fixture
def active_time_entry(db, tenant, employee, time_entry_type):
    """Create an active (clocked in) time entry without end time."""
    from datetime import date, time

    from apps.timetracking.models import TimeEntry

    return TimeEntry.objects.create(
        tenant=tenant,
        employee=employee,
        entry_type=time_entry_type,
        date=date.today(),
        start_time=time(9, 0),
        end_time=None,
        break_minutes=0,
    )


# ============================================================================
# Leave Fixtures
# ============================================================================


@pytest.fixture
def leave_type(db, tenant):
    """Create an annual leave type."""
    from apps.leave.models import LeaveType

    return LeaveType.objects.create(
        tenant=tenant,
        name="Annual Leave",
        code="ANNUAL",
        is_paid=True,
        requires_approval=True,
        max_consecutive_days=14,
        color="#10b981",
        is_active=True,
    )


@pytest.fixture
def sick_leave_type(db, tenant):
    """Create a sick leave type."""
    from apps.leave.models import LeaveType

    return LeaveType.objects.create(
        tenant=tenant,
        name="Sick Leave",
        code="SICK",
        is_paid=True,
        requires_approval=True,
        color="#ef4444",
        is_active=True,
    )


@pytest.fixture
def leave_balance(db, tenant, employee, leave_type):
    """Create a leave balance for the employee."""
    from datetime import date
    from decimal import Decimal

    from apps.leave.models import LeaveBalance

    return LeaveBalance.objects.create(
        tenant=tenant,
        employee=employee,
        leave_type=leave_type,
        year=date.today().year,
        entitled_days=Decimal("20.0"),
        used_days=Decimal("0.0"),
        carried_over=Decimal("2.0"),
    )


@pytest.fixture
def leave_request(db, tenant, employee, leave_type):
    """Create a pending leave request."""
    from datetime import date, timedelta

    from apps.leave.models import LeaveRequest

    return LeaveRequest.objects.create(
        tenant=tenant,
        employee=employee,
        leave_type=leave_type,
        start_date=date.today() + timedelta(days=7),
        end_date=date.today() + timedelta(days=9),
        reason="Vacation",
        status="pending",
    )


# ============================================================================
# Timesheet Fixtures
# ============================================================================


@pytest.fixture
def timesheet(db, tenant, employee):
    """Create a draft timesheet."""
    from datetime import date, timedelta
    from decimal import Decimal

    from apps.timesheets.models import Timesheet

    today = date.today()
    period_start = today - timedelta(days=14)
    period_end = today - timedelta(days=1)

    return Timesheet.objects.create(
        tenant=tenant,
        employee=employee,
        period_start=period_start,
        period_end=period_end,
        status="draft",
        total_regular_hours=Decimal("80.0"),
        total_overtime_hours=Decimal("5.0"),
        total_break_hours=Decimal("10.0"),
    )


@pytest.fixture
def submitted_timesheet(db, tenant, employee):
    """Create a submitted timesheet."""
    from datetime import date, timedelta
    from decimal import Decimal

    from django.utils import timezone

    from apps.timesheets.models import Timesheet

    today = date.today()
    period_start = today - timedelta(days=28)
    period_end = today - timedelta(days=15)

    return Timesheet.objects.create(
        tenant=tenant,
        employee=employee,
        period_start=period_start,
        period_end=period_end,
        status="submitted",
        total_regular_hours=Decimal("80.0"),
        total_overtime_hours=Decimal("0.0"),
        total_break_hours=Decimal("10.0"),
        submitted_at=timezone.now(),
    )


# ============================================================================
# Contract Fixtures
# ============================================================================


@pytest.fixture
def contract_type(db, tenant):
    """Create a full-time contract type."""
    from apps.contracts.models import ContractType

    return ContractType.objects.create(
        tenant=tenant,
        name="Full-time",
        code="FT",
        description="Full-time employment",
        is_active=True,
    )


@pytest.fixture
def contract(db, tenant, employee, contract_type):
    """Create a draft contract."""
    from datetime import date, timedelta
    from decimal import Decimal

    from apps.contracts.models import Contract

    return Contract.objects.create(
        tenant=tenant,
        employee=employee,
        contract_type=contract_type,
        title=f"Employment Contract - {employee.full_name}",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=365),
        status="draft",
        salary=Decimal("60000.00"),
        salary_currency="USD",
        salary_period="yearly",
        hours_per_week=Decimal("40.0"),
        notice_period_days=30,
    )


@pytest.fixture
def active_contract(db, tenant, employee, contract_type):
    """Create an active contract."""
    from datetime import date, timedelta
    from decimal import Decimal

    from apps.contracts.models import Contract

    return Contract.objects.create(
        tenant=tenant,
        employee=employee,
        contract_type=contract_type,
        title=f"Employment Contract - {employee.full_name}",
        start_date=date.today() - timedelta(days=30),
        end_date=date.today() + timedelta(days=335),
        status="active",
        salary=Decimal("60000.00"),
        salary_currency="USD",
        salary_period="yearly",
        hours_per_week=Decimal("40.0"),
        notice_period_days=30,
        probation_passed=True,
    )


@pytest.fixture
def expiring_contract(db, tenant, employee, contract_type):
    """Create a contract expiring within 30 days."""
    from datetime import date, timedelta
    from decimal import Decimal

    from apps.contracts.models import Contract

    return Contract.objects.create(
        tenant=tenant,
        employee=employee,
        contract_type=contract_type,
        title=f"Expiring Contract - {employee.full_name}",
        start_date=date.today() - timedelta(days=350),
        end_date=date.today() + timedelta(days=15),
        status="active",
        salary=Decimal("60000.00"),
        salary_currency="USD",
        salary_period="yearly",
        hours_per_week=Decimal("40.0"),
    )
