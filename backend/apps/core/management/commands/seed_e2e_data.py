"""
Management command to seed minimal data required for E2E tests.

This creates only the essential data needed for E2E tests to run:
- A test user with known credentials
- A test tenant with the user as a member
- Basic organizational structure (department, position)
- An employee record linked to the user

Usage:
    python manage.py seed_e2e_data
"""

import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.contracts.models import ContractType
from apps.employees.models import Department, Employee, Position
from apps.leave.models import LeaveType
from apps.tenants.models import Tenant, TenantMembership, TenantSettings
from apps.timetracking.models import TimeEntryType

User = get_user_model()

# E2E test user credentials (must match frontend/e2e/helpers/auth.ts)
E2E_USER = {
    "email": "e2e-test@example.com",
    "password": "TestPassword123!",
    "first_name": "E2E",
    "last_name": "Tester",
}

E2E_TENANT = {
    "name": "E2E Test Company",
    "slug": "e2e-test",
}


class Command(BaseCommand):
    help = "Seed minimal data required for E2E tests"

    def handle(self, *args, **options):
        self.stdout.write("Seeding E2E test data...")

        with transaction.atomic():
            # Clean up existing E2E data for idempotency
            self._cleanup()

            # Create test user
            user = self._create_user()

            # Create test tenant
            tenant = self._create_tenant()

            # Link user to tenant
            self._create_membership(user, tenant)

            # Create organizational structure
            department = self._create_department(tenant)
            position = self._create_position(tenant, department)

            # Create employee for the user
            self._create_employee(tenant, user, department, position)

            # Create required types
            self._create_leave_types(tenant)
            self._create_time_entry_types(tenant)
            self._create_contract_types(tenant)

        self.stdout.write(self.style.SUCCESS("E2E test data seeded successfully!"))
        self.stdout.write(f"\n  Email:    {E2E_USER['email']}")
        self.stdout.write(f"  Password: {E2E_USER['password']}")
        self.stdout.write(f"  Tenant:   {E2E_TENANT['slug']}\n")

    def _cleanup(self):
        """Remove existing E2E test data."""
        User.objects.filter(email=E2E_USER["email"]).delete()
        Tenant.objects.filter(slug=E2E_TENANT["slug"]).delete()
        self.stdout.write("  Cleaned up existing E2E data")

    def _create_user(self):
        """Create the E2E test user."""
        user = User.objects.create_user(
            email=E2E_USER["email"],
            password=E2E_USER["password"],
            first_name=E2E_USER["first_name"],
            last_name=E2E_USER["last_name"],
            is_active=True,
        )
        self.stdout.write(f"  Created user: {user.email}")
        return user

    def _create_tenant(self):
        """Create the E2E test tenant."""
        tenant = Tenant.objects.create(
            name=E2E_TENANT["name"],
            slug=E2E_TENANT["slug"],
            plan="professional",
            max_employees=100,
            is_active=True,
        )
        TenantSettings.objects.create(
            tenant=tenant,
            timezone="UTC",
            currency="USD",
        )
        self.stdout.write(f"  Created tenant: {tenant.name}")
        return tenant

    def _create_membership(self, user, tenant):
        """Create tenant membership for the user."""
        TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            role="owner",
            is_default=True,
        )
        self.stdout.write("  Created tenant membership")

    def _create_department(self, tenant):
        """Create a test department."""
        department = Department.objects.create(
            tenant=tenant,
            name="Engineering",
            code="ENG",
            is_active=True,
        )
        self.stdout.write(f"  Created department: {department.name}")
        return department

    def _create_position(self, tenant, department):
        """Create a test position."""
        position = Position.objects.create(
            tenant=tenant,
            title="Software Engineer",
            code="SWE",
            department=department,
            level=3,
            is_active=True,
        )
        self.stdout.write(f"  Created position: {position.title}")
        return position

    def _create_employee(self, tenant, user, department, position):
        """Create an employee record for the test user."""
        employee = Employee.objects.create(
            tenant=tenant,
            user=user,
            employee_id="EMP-E2E-001",
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            department=department,
            position=position,
            status="active",
            hire_date=datetime.date.today() - datetime.timedelta(days=365),
            date_of_birth=datetime.date(1990, 1, 15),
        )
        self.stdout.write(f"  Created employee: {employee.full_name}")
        return employee

    def _create_leave_types(self, tenant):
        """Create basic leave types."""
        types = [
            {"name": "Annual Leave", "code": "ANNUAL", "color": "#10b981"},
            {"name": "Sick Leave", "code": "SICK", "color": "#ef4444"},
        ]
        for t in types:
            LeaveType.objects.create(
                tenant=tenant,
                name=t["name"],
                code=t["code"],
                color=t["color"],
                is_paid=True,
                requires_approval=True,
                is_active=True,
            )
        self.stdout.write(f"  Created {len(types)} leave types")

    def _create_time_entry_types(self, tenant):
        """Create basic time entry types."""
        types = [
            {"name": "Regular", "code": "REG", "multiplier": "1.0", "color": "#3b82f6"},
            {"name": "Overtime", "code": "OT", "multiplier": "1.5", "color": "#f59e0b"},
        ]
        for t in types:
            TimeEntryType.objects.create(
                tenant=tenant,
                name=t["name"],
                code=t["code"],
                multiplier=Decimal(t["multiplier"]),
                color=t["color"],
                is_paid=True,
                is_active=True,
            )
        self.stdout.write(f"  Created {len(types)} time entry types")

    def _create_contract_types(self, tenant):
        """Create basic contract types."""
        types = [
            {"name": "Full-time", "code": "FT"},
            {"name": "Part-time", "code": "PT"},
        ]
        for t in types:
            ContractType.objects.create(
                tenant=tenant,
                name=t["name"],
                code=t["code"],
                is_active=True,
            )
        self.stdout.write(f"  Created {len(types)} contract types")
