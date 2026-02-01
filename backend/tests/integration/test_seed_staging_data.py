"""
Tests for the seed_staging_data management command.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.contracts.models import Contract, ContractType
from apps.employees.models import Department, Employee, Position
from apps.leave.models import LeaveBalance, LeaveRequest, LeaveType
from apps.tenants.models import Tenant, TenantMembership
from apps.timetracking.models import TimeEntry, TimeEntryType
from apps.timesheets.models import Timesheet

User = get_user_model()


@pytest.fixture
def seeded_db(db):
    """Run the seed command and provide access to demo data."""
    call_command("seed_staging_data", "--no-holidays")
    yield
    # Cleanup is handled by Django's test transaction rollback


@pytest.mark.django_db
class TestSeedStagingDataCommand:
    """Test suite for seed_staging_data management command."""

    def test_creates_demo_users(self, seeded_db):
        """Verify demo users are created with correct emails."""
        # Check demo users exist
        assert User.objects.filter(email="admin@demo.com").exists()
        assert User.objects.filter(email="manager@demo.com").exists()
        assert User.objects.filter(email="employee@demo.com").exists()

        # Verify user count
        demo_users = User.objects.filter(email__endswith="@demo.com")
        assert demo_users.count() == 3

    def test_creates_demo_tenants(self, seeded_db):
        """Verify demo tenants are created with correct configurations."""
        # Check tenants exist
        assert Tenant.objects.filter(slug="demo-acme").exists()
        assert Tenant.objects.filter(slug="demo-techcorp").exists()
        assert Tenant.objects.filter(slug="demo-global").exists()

        # Verify tenant count
        demo_tenants = Tenant.objects.filter(slug__startswith="demo-")
        assert demo_tenants.count() == 3

    def test_creates_tenant_settings(self, seeded_db):
        """Verify tenant settings are created with correct currencies."""
        acme = Tenant.objects.get(slug="demo-acme")
        techcorp = Tenant.objects.get(slug="demo-techcorp")
        global_sol = Tenant.objects.get(slug="demo-global")

        assert acme.settings.currency == "USD"
        assert techcorp.settings.currency == "EUR"
        assert global_sol.settings.currency == "GBP"

    def test_creates_tenant_memberships(self, seeded_db):
        """Verify users are linked to all tenants with correct roles."""
        admin = User.objects.get(email="admin@demo.com")
        manager = User.objects.get(email="manager@demo.com")
        employee = User.objects.get(email="employee@demo.com")

        # Each user should have 3 memberships (one per tenant)
        assert admin.tenant_memberships.count() == 3
        assert manager.tenant_memberships.count() == 3
        assert employee.tenant_memberships.count() == 3

        # Verify roles
        acme = Tenant.objects.get(slug="demo-acme")
        assert TenantMembership.objects.get(user=admin, tenant=acme).role == "owner"
        assert TenantMembership.objects.get(user=manager, tenant=acme).role == "manager"
        assert TenantMembership.objects.get(user=employee, tenant=acme).role == "employee"

    def test_creates_departments(self, seeded_db):
        """Verify departments are created with hierarchy."""
        acme = Tenant.objects.get(slug="demo-acme")
        departments = Department.objects.filter(tenant=acme)

        assert departments.count() == 8

        # Check hierarchy
        executive = departments.get(code="EXEC")
        engineering = departments.get(code="ENG")
        backend = departments.get(code="ENG-BE")

        assert executive.parent is None
        assert engineering.parent == executive
        assert backend.parent == engineering

    def test_creates_positions(self, seeded_db):
        """Verify positions are created and linked to departments."""
        acme = Tenant.objects.get(slug="demo-acme")
        positions = Position.objects.filter(tenant=acme)

        assert positions.count() == 15

        # Verify level range
        assert positions.filter(level=5).count() >= 3  # C-level positions
        assert positions.filter(level=1).count() >= 1  # Junior positions

    def test_creates_employees(self, seeded_db):
        """Verify employees are created with proper distribution."""
        acme = Tenant.objects.get(slug="demo-acme")
        employees = Employee.objects.filter(tenant=acme)

        assert employees.count() == 25

        # Verify status distribution
        assert employees.filter(status="active").count() >= 20
        assert employees.filter(status="on_leave").count() >= 1

    def test_creates_leave_types(self, seeded_db):
        """Verify leave types are created."""
        acme = Tenant.objects.get(slug="demo-acme")
        leave_types = LeaveType.objects.filter(tenant=acme)

        assert leave_types.count() == 5
        assert leave_types.filter(code="ANNUAL").exists()
        assert leave_types.filter(code="SICK").exists()

    def test_creates_leave_balances(self, seeded_db):
        """Verify leave balances are created for employees."""
        acme = Tenant.objects.get(slug="demo-acme")
        balances = LeaveBalance.objects.filter(tenant=acme)

        # Should have balances for most employees across leave types
        assert balances.count() > 50

    def test_creates_leave_requests(self, seeded_db):
        """Verify leave requests are created with varied statuses."""
        acme = Tenant.objects.get(slug="demo-acme")
        requests = LeaveRequest.objects.filter(tenant=acme)

        assert requests.count() == 20
        assert requests.filter(status="pending").exists()
        assert requests.filter(status="approved").exists()
        assert requests.filter(status="rejected").exists()

    def test_creates_time_entry_types(self, seeded_db):
        """Verify time entry types are created."""
        acme = Tenant.objects.get(slug="demo-acme")
        entry_types = TimeEntryType.objects.filter(tenant=acme)

        assert entry_types.count() == 4
        assert entry_types.filter(code="REG").exists()
        assert entry_types.filter(code="OT").exists()

    def test_creates_time_entries(self, seeded_db):
        """Verify time entries are created."""
        acme = Tenant.objects.get(slug="demo-acme")
        entries = TimeEntry.objects.filter(tenant=acme)

        # Should have a substantial number of entries
        assert entries.count() >= 100

    def test_creates_timesheets(self, seeded_db):
        """Verify timesheets are created with varied statuses."""
        acme = Tenant.objects.get(slug="demo-acme")
        timesheets = Timesheet.objects.filter(tenant=acme)

        assert timesheets.count() == 6
        assert timesheets.filter(status="draft").exists()
        assert timesheets.filter(status="submitted").exists()
        assert timesheets.filter(status="approved").exists()

    def test_creates_contract_types(self, seeded_db):
        """Verify contract types are created."""
        acme = Tenant.objects.get(slug="demo-acme")
        contract_types = ContractType.objects.filter(tenant=acme)

        assert contract_types.count() == 4
        assert contract_types.filter(code="FT").exists()
        assert contract_types.filter(code="PT").exists()

    def test_creates_contracts(self, seeded_db):
        """Verify contracts are created for all employees."""
        acme = Tenant.objects.get(slug="demo-acme")
        contracts = Contract.objects.filter(tenant=acme)

        assert contracts.count() == 25  # One per employee
        assert contracts.filter(status="active").count() >= 20

    def test_demo_user_can_authenticate(self, seeded_db):
        """Verify demo users can log in with known passwords."""
        admin = User.objects.get(email="admin@demo.com")
        assert admin.check_password("demo123!")

        manager = User.objects.get(email="manager@demo.com")
        assert manager.check_password("demo123!")

        employee = User.objects.get(email="employee@demo.com")
        assert employee.check_password("demo123!")

    def test_all_tenants_get_data(self, seeded_db):
        """Verify all three tenants get seeded with data."""
        for slug in ["demo-acme", "demo-techcorp", "demo-global"]:
            tenant = Tenant.objects.get(slug=slug)

            assert Department.objects.filter(tenant=tenant).count() == 8
            assert Position.objects.filter(tenant=tenant).count() == 15
            assert Employee.objects.filter(tenant=tenant).count() == 25
            assert LeaveType.objects.filter(tenant=tenant).count() == 5
            assert TimeEntryType.objects.filter(tenant=tenant).count() == 4
            assert ContractType.objects.filter(tenant=tenant).count() == 4


@pytest.mark.django_db
class TestSeedStagingDataIdempotency:
    """Test idempotency separately as it requires multiple command runs."""

    def test_idempotency(self):
        """Verify running the command twice produces the same result."""
        call_command("seed_staging_data", "--no-holidays")

        # Get counts after first run
        user_count_1 = User.objects.filter(email__endswith="@demo.com").count()
        tenant_count_1 = Tenant.objects.filter(slug__startswith="demo-").count()
        employee_count_1 = Employee.objects.filter(tenant__slug__startswith="demo-").count()

        # Run again
        call_command("seed_staging_data", "--no-holidays")

        # Counts should be the same (not doubled)
        user_count_2 = User.objects.filter(email__endswith="@demo.com").count()
        tenant_count_2 = Tenant.objects.filter(slug__startswith="demo-").count()
        employee_count_2 = Employee.objects.filter(tenant__slug__startswith="demo-").count()

        assert user_count_1 == user_count_2 == 3
        assert tenant_count_1 == tenant_count_2 == 3
        assert employee_count_1 == employee_count_2 == 75  # 25 per tenant * 3 tenants
