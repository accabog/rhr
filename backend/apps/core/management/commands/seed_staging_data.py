"""
Management command to seed staging database with realistic demo data.

This command creates consistent demo data for testing and QA purposes:
- 3 demo tenants with different configurations (US, DE, GB)
- 3 demo users with known credentials for each tenant
- ~25 employees per tenant with full HR data

Usage:
    python manage.py seed_staging_data              # Staging/local only
    python manage.py seed_staging_data --force      # Force on any environment
    python manage.py seed_staging_data --no-holidays  # Skip holiday sync
"""

import datetime
import random
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.contracts.models import Contract, ContractType
from apps.employees.models import Department, Employee, Position
from apps.leave.models import LeaveBalance, LeaveRequest, LeaveType
from apps.tenants.models import Tenant, TenantMembership, TenantSettings
from apps.timesheets.models import Timesheet
from apps.timetracking.models import TimeEntry, TimeEntryType

User = get_user_model()

# Faker-like data for generating realistic names
FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Christopher", "Karen", "Daniel", "Lisa", "Matthew", "Nancy",
    "Anthony", "Betty", "Mark", "Margaret", "Donald", "Sandra", "Steven", "Ashley",
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
]


def generate_employee_id(n: int) -> str:
    """Generate employee ID like EMP-00001."""
    return f"EMP-{n:05d}"


def generate_phone() -> str:
    """Generate a fake phone number."""
    return f"+1-{random.randint(200, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}"


# Demo user credentials (known for testing)
DEMO_USERS = [
    {
        "email": "admin@demo.com",
        "password": "demo123!",
        "first_name": "Demo",
        "last_name": "Admin",
        "role": "owner",
    },
    {
        "email": "manager@demo.com",
        "password": "demo123!",
        "first_name": "Demo",
        "last_name": "Manager",
        "role": "manager",
    },
    {
        "email": "employee@demo.com",
        "password": "demo123!",
        "first_name": "Demo",
        "last_name": "Employee",
        "role": "employee",
    },
]

# Demo tenant configurations
DEMO_TENANTS = [
    {
        "name": "Acme Corporation",
        "slug": "demo-acme",
        "country": "US",
        "currency": "USD",
        "timezone": "America/New_York",
    },
    {
        "name": "TechCorp GmbH",
        "slug": "demo-techcorp",
        "country": "DE",
        "currency": "EUR",
        "timezone": "Europe/Berlin",
    },
    {
        "name": "Global Solutions Ltd",
        "slug": "demo-global",
        "country": "GB",
        "currency": "GBP",
        "timezone": "Europe/London",
    },
]

# Department hierarchy templates
DEPARTMENT_TEMPLATES = [
    {"name": "Executive", "code": "EXEC", "parent": None},
    {"name": "Finance", "code": "FIN", "parent": "Executive"},
    {"name": "Human Resources", "code": "HR", "parent": "Executive"},
    {"name": "Engineering", "code": "ENG", "parent": "Executive"},
    {"name": "Backend Team", "code": "ENG-BE", "parent": "Engineering"},
    {"name": "Frontend Team", "code": "ENG-FE", "parent": "Engineering"},
    {"name": "QA Team", "code": "ENG-QA", "parent": "Engineering"},
    {"name": "Operations", "code": "OPS", "parent": "Executive"},
]

# Position templates by department
POSITION_TEMPLATES = [
    {"title": "CEO", "code": "CEO", "dept": "Executive", "level": 5},
    {"title": "CFO", "code": "CFO", "dept": "Finance", "level": 5},
    {"title": "Finance Manager", "code": "FIN-MGR", "dept": "Finance", "level": 4},
    {"title": "Accountant", "code": "FIN-ACC", "dept": "Finance", "level": 2},
    {"title": "HR Director", "code": "HR-DIR", "dept": "Human Resources", "level": 4},
    {"title": "HR Specialist", "code": "HR-SPEC", "dept": "Human Resources", "level": 2},
    {"title": "CTO", "code": "CTO", "dept": "Engineering", "level": 5},
    {"title": "Engineering Manager", "code": "ENG-MGR", "dept": "Engineering", "level": 4},
    {"title": "Senior Developer", "code": "ENG-SR", "dept": "Backend Team", "level": 3},
    {"title": "Developer", "code": "ENG-DEV", "dept": "Backend Team", "level": 2},
    {"title": "Junior Developer", "code": "ENG-JR", "dept": "Backend Team", "level": 1},
    {"title": "Frontend Developer", "code": "FE-DEV", "dept": "Frontend Team", "level": 2},
    {"title": "QA Engineer", "code": "QA-ENG", "dept": "QA Team", "level": 2},
    {"title": "Operations Manager", "code": "OPS-MGR", "dept": "Operations", "level": 4},
    {"title": "Operations Specialist", "code": "OPS-SPEC", "dept": "Operations", "level": 2},
]

# Leave type templates
LEAVE_TYPE_TEMPLATES = [
    {"name": "Annual Leave", "code": "ANNUAL", "is_paid": True, "max_days": 14, "color": "#10b981"},
    {"name": "Sick Leave", "code": "SICK", "is_paid": True, "max_days": None, "color": "#ef4444"},
    {"name": "Personal Leave", "code": "PERSONAL", "is_paid": True, "max_days": 3, "color": "#8b5cf6"},
    {"name": "Parental Leave", "code": "PARENTAL", "is_paid": True, "max_days": None, "color": "#f59e0b"},
    {"name": "Unpaid Leave", "code": "UNPAID", "is_paid": False, "max_days": 30, "color": "#6b7280"},
]

# Time entry type templates
TIME_ENTRY_TYPE_TEMPLATES = [
    {"name": "Regular", "code": "REG", "is_paid": True, "multiplier": "1.0", "color": "#3b82f6"},
    {"name": "Overtime", "code": "OT", "is_paid": True, "multiplier": "1.5", "color": "#f59e0b"},
    {"name": "Weekend", "code": "WKND", "is_paid": True, "multiplier": "2.0", "color": "#8b5cf6"},
    {"name": "Holiday", "code": "HOL", "is_paid": True, "multiplier": "2.5", "color": "#ef4444"},
]

# Contract type templates
CONTRACT_TYPE_TEMPLATES = [
    {"name": "Full-time", "code": "FT", "description": "Full-time employment contract"},
    {"name": "Part-time", "code": "PT", "description": "Part-time employment contract"},
    {"name": "Contractor", "code": "CONTR", "description": "Independent contractor agreement"},
    {"name": "Intern", "code": "INTERN", "description": "Internship agreement"},
]


class Command(BaseCommand):
    help = "Seed staging database with realistic demo data"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._employee_counter = 0

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force seeding even in non-staging environments",
        )
        parser.add_argument(
            "--no-holidays",
            action="store_true",
            help="Skip syncing holidays at the end",
        )

    def handle(self, *args, **options):
        self._check_environment(options["force"])

        self.stdout.write("\nStarting staging data seed...")
        self.stdout.write("=" * 60)

        with transaction.atomic():
            self._clear_seed_data()
            users = self._create_demo_users()
            tenants = self._create_demo_tenants()
            self._link_users_to_tenants(users, tenants)

            for tenant_config, tenant in zip(DEMO_TENANTS, tenants, strict=True):
                self._seed_tenant_data(tenant, tenant_config)

        # Sync holidays outside transaction (makes API calls)
        if not options["no_holidays"]:
            self._sync_holidays(tenants)

        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS("\nStaging data seed complete!"))
        self._print_login_info()

    def _check_environment(self, force: bool):
        """Ensure we're not accidentally seeding production."""
        settings_module = settings.SETTINGS_MODULE
        is_safe = (
            settings.DEBUG
            or "local" in settings_module
            or "staging" in settings_module
            or "test" in settings_module
        )

        if not is_safe and not force:
            raise CommandError(
                "This command can only run in local/staging environments.\n"
                "Use --force to override (DANGEROUS in production!)."
            )

        if force and not is_safe:
            self.stdout.write(
                self.style.WARNING("\nWARNING: Running seed in non-staging environment with --force")
            )

    def _clear_seed_data(self):
        """Remove existing demo data for idempotency."""
        self.stdout.write("\nClearing existing demo data...")

        # Delete demo users (by email pattern)
        demo_user_count = User.objects.filter(email__endswith="@demo.com").delete()[0]
        self.stdout.write(f"  Deleted {demo_user_count} demo users")

        # Delete objects with PROTECTED foreign keys first
        # These reference types (LeaveType, TimeEntryType, ContractType) that CASCADE from Tenant
        demo_tenants = Tenant.objects.filter(slug__startswith="demo-")
        TimeEntry.objects.filter(tenant__in=demo_tenants).delete()
        LeaveRequest.objects.filter(tenant__in=demo_tenants).delete()
        Contract.objects.filter(tenant__in=demo_tenants).delete()

        # Now delete demo tenants (CASCADE handles remaining related data)
        demo_tenant_count = demo_tenants.delete()[0]
        self.stdout.write(f"  Deleted {demo_tenant_count} demo tenants (and related data)")

    def _create_demo_users(self):
        """Create demo users with known credentials."""
        self.stdout.write("\nCreating demo users...")

        users = []
        for user_data in DEMO_USERS:
            user = User.objects.create_user(
                email=user_data["email"],
                password=user_data["password"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                is_active=True,
            )
            users.append({"user": user, "role": user_data["role"]})
            self.stdout.write(f"  Created user: {user.email}")

        return users

    def _create_demo_tenants(self):
        """Create demo tenants with different configurations."""
        self.stdout.write("\nCreating demo tenants...")

        tenants = []
        for config in DEMO_TENANTS:
            tenant = Tenant.objects.create(
                name=config["name"],
                slug=config["slug"],
                plan="professional",
                max_employees=100,
                is_active=True,
            )
            # Create tenant settings
            TenantSettings.objects.create(
                tenant=tenant,
                timezone=config["timezone"],
                currency=config["currency"],
            )
            tenants.append(tenant)
            self.stdout.write(f"  Created tenant: {tenant.name} ({config['country']})")

        return tenants

    def _link_users_to_tenants(self, users, tenants):
        """Link demo users to all demo tenants with appropriate roles."""
        self.stdout.write("\nLinking users to tenants...")

        for tenant in tenants:
            for user_data in users:
                TenantMembership.objects.create(
                    user=user_data["user"],
                    tenant=tenant,
                    role=user_data["role"],
                    is_default=(tenant == tenants[0]),  # First tenant is default
                )

        self.stdout.write(f"  Created {len(users) * len(tenants)} tenant memberships")

    def _seed_tenant_data(self, tenant, config):
        """Seed all data for a single tenant."""
        self.stdout.write(f"\n{'=' * 40}")
        self.stdout.write(f"Seeding data for: {tenant.name}")
        self.stdout.write(f"{'=' * 40}")

        # Reset employee counter for each tenant
        self._employee_counter = 0

        # Create organizational structure
        departments = self._create_departments(tenant, config["country"])
        positions = self._create_positions(tenant, departments)

        # Create employees
        employees = self._create_employees(tenant, departments, positions)

        # Create types
        leave_types = self._create_leave_types(tenant)
        time_entry_types = self._create_time_entry_types(tenant)
        contract_types = self._create_contract_types(tenant)

        # Create transactional data
        self._create_leave_data(tenant, employees, leave_types)
        self._create_time_entries(tenant, employees, time_entry_types)
        self._create_timesheets(tenant, employees)
        self._create_contracts(tenant, employees, contract_types)

    def _create_departments(self, tenant, country):
        """Create hierarchical department structure."""
        departments = {}

        for template in DEPARTMENT_TEMPLATES:
            parent = departments.get(template["parent"])
            dept = Department.objects.create(
                tenant=tenant,
                name=template["name"],
                code=template["code"],
                parent=parent,
                country=country,  # Use tenant's country for all departments
                is_active=True,
            )
            departments[template["name"]] = dept

        self.stdout.write(f"  Created {len(departments)} departments")
        return departments

    def _create_positions(self, tenant, departments):
        """Create positions linked to departments."""
        positions = {}

        for template in POSITION_TEMPLATES:
            dept = departments.get(template["dept"])
            pos = Position.objects.create(
                tenant=tenant,
                title=template["title"],
                code=template["code"],
                department=dept,
                level=template["level"],
                is_active=True,
            )
            positions[template["code"]] = pos

        self.stdout.write(f"  Created {len(positions)} positions")
        return positions

    def _create_employees(self, tenant, departments, positions):
        """Create ~25 employees with varied statuses."""
        employees = []
        today = datetime.date.today()

        # Get position list for random assignment
        position_list = list(positions.values())
        department_list = list(departments.values())

        # Create managers first (level 4-5 positions)
        manager_positions = [p for p in position_list if p.level >= 4]
        managers = []

        for pos in manager_positions[:5]:
            emp = self._create_employee(
                tenant=tenant,
                department=pos.department,
                position=pos,
                manager=None,
                status="active",
                hire_date=today - datetime.timedelta(days=random.randint(365, 1095)),
            )
            employees.append(emp)
            managers.append(emp)

            # Set as department manager
            if pos.department:
                pos.department.manager = emp
                pos.department.save()

        # Create regular employees (20 more)
        regular_positions = [p for p in position_list if p.level < 4]
        statuses = ["active"] * 17 + ["on_leave"] * 2 + ["suspended"] * 1

        for i in range(20):
            pos = random.choice(regular_positions) if regular_positions else position_list[0]
            manager = random.choice(managers) if managers else None
            status = statuses[i] if i < len(statuses) else "active"

            emp = self._create_employee(
                tenant=tenant,
                department=pos.department if pos else random.choice(department_list),
                position=pos,
                manager=manager,
                status=status,
                hire_date=today - datetime.timedelta(days=random.randint(30, 730)),
            )
            employees.append(emp)

        self.stdout.write(f"  Created {len(employees)} employees")
        return employees

    def _create_employee(self, tenant, department, position, manager, status, hire_date):
        """Create a single employee with generated data."""
        self._employee_counter += 1
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        email = f"{first_name.lower()}.{last_name.lower()}{self._employee_counter}@example.com"

        return Employee.objects.create(
            tenant=tenant,
            employee_id=generate_employee_id(self._employee_counter),
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=generate_phone(),
            department=department,
            position=position,
            manager=manager,
            status=status,
            hire_date=hire_date,
            date_of_birth=datetime.date(
                random.randint(1960, 2000),
                random.randint(1, 12),
                random.randint(1, 28),
            ),
            address=f"{random.randint(100, 9999)} Main Street, City, State {random.randint(10000, 99999)}",
            emergency_contact_name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            emergency_contact_phone=generate_phone(),
        )

    def _create_leave_types(self, tenant):
        """Create leave types for the tenant."""
        leave_types = {}

        for template in LEAVE_TYPE_TEMPLATES:
            lt = LeaveType.objects.create(
                tenant=tenant,
                name=template["name"],
                code=template["code"],
                is_paid=template["is_paid"],
                max_consecutive_days=template["max_days"],
                color=template["color"],
                requires_approval=True,
                is_active=True,
            )
            leave_types[template["code"]] = lt

        self.stdout.write(f"  Created {len(leave_types)} leave types")
        return leave_types

    def _create_time_entry_types(self, tenant):
        """Create time entry types for the tenant."""
        entry_types = {}

        for template in TIME_ENTRY_TYPE_TEMPLATES:
            tet = TimeEntryType.objects.create(
                tenant=tenant,
                name=template["name"],
                code=template["code"],
                is_paid=template["is_paid"],
                multiplier=Decimal(template["multiplier"]),
                color=template["color"],
                is_active=True,
            )
            entry_types[template["code"]] = tet

        self.stdout.write(f"  Created {len(entry_types)} time entry types")
        return entry_types

    def _create_contract_types(self, tenant):
        """Create contract types for the tenant."""
        contract_types = {}

        for template in CONTRACT_TYPE_TEMPLATES:
            ct = ContractType.objects.create(
                tenant=tenant,
                name=template["name"],
                code=template["code"],
                description=template["description"],
                is_active=True,
            )
            contract_types[template["code"]] = ct

        self.stdout.write(f"  Created {len(contract_types)} contract types")
        return contract_types

    def _create_leave_data(self, tenant, employees, leave_types):
        """Create leave balances and requests."""
        today = datetime.date.today()
        year = today.year
        balance_count = 0
        request_count = 0

        # Create balances for each employee
        for emp in employees:
            if emp.status == "terminated":
                continue

            for code, lt in leave_types.items():
                entitled = 20 if code == "ANNUAL" else (10 if code == "SICK" else 5)
                used = Decimal(random.randint(0, int(entitled // 2)))

                LeaveBalance.objects.create(
                    tenant=tenant,
                    employee=emp,
                    leave_type=lt,
                    year=year,
                    entitled_days=Decimal(entitled),
                    used_days=used,
                    carried_over=Decimal(random.randint(0, 3)),
                )
                balance_count += 1

        # Create 20 leave requests with varied statuses
        active_employees = [e for e in employees if e.status == "active"]
        statuses = ["pending"] * 5 + ["approved"] * 10 + ["rejected"] * 3 + ["cancelled"] * 2
        leave_type_list = list(leave_types.values())

        for i in range(20):
            emp = random.choice(active_employees)
            lt = random.choice(leave_type_list)
            status = statuses[i]

            # Dates: past for approved/rejected, future for pending
            if status in ("approved", "rejected"):
                start_offset = random.randint(-60, -7)
            else:
                start_offset = random.randint(7, 60)

            start_date = today + datetime.timedelta(days=start_offset)
            duration = random.randint(1, 5)
            end_date = start_date + datetime.timedelta(days=duration - 1)

            LeaveRequest.objects.create(
                tenant=tenant,
                employee=emp,
                leave_type=lt,
                start_date=start_date,
                end_date=end_date,
                status=status,
                reason=f"Demo leave request #{i + 1}",
            )
            request_count += 1

        self.stdout.write(f"  Created {balance_count} leave balances")
        self.stdout.write(f"  Created {request_count} leave requests")

    def _create_time_entries(self, tenant, employees, entry_types):
        """Create time entries for the past 30 days."""
        today = datetime.date.today()
        entry_count = 0
        regular_type = entry_types.get("REG", list(entry_types.values())[0])
        overtime_type = entry_types.get("OT", regular_type)

        # Select 15 active employees for time entries
        active_employees = [e for e in employees if e.status == "active"][:15]

        for emp in active_employees:
            # Create entries for ~10 random workdays in the past 30 days
            for _ in range(10):
                days_ago = random.randint(1, 30)
                entry_date = today - datetime.timedelta(days=days_ago)

                # Skip weekends
                if entry_date.weekday() >= 5:
                    continue

                # Regular work hours (vary start time slightly)
                start_hour = random.randint(8, 9)
                start_minute = random.choice([0, 15, 30, 45])
                end_hour = start_hour + 8 + random.randint(0, 1)
                end_minute = random.choice([0, 15, 30, 45])

                TimeEntry.objects.create(
                    tenant=tenant,
                    employee=emp,
                    entry_type=regular_type,
                    date=entry_date,
                    start_time=datetime.time(start_hour, start_minute),
                    end_time=datetime.time(end_hour, end_minute),
                    break_minutes=random.choice([30, 45, 60]),
                    is_approved=days_ago > 7,  # Older entries are approved
                )
                entry_count += 1

                # 20% chance of overtime entry
                if random.random() < 0.2:
                    TimeEntry.objects.create(
                        tenant=tenant,
                        employee=emp,
                        entry_type=overtime_type,
                        date=entry_date,
                        start_time=datetime.time(end_hour, end_minute),
                        end_time=datetime.time(end_hour + 2, 0),
                        break_minutes=0,
                        is_approved=days_ago > 7,
                    )
                    entry_count += 1

        self.stdout.write(f"  Created {entry_count} time entries")

    def _create_timesheets(self, tenant, employees):
        """Create timesheets with varied statuses."""
        today = datetime.date.today()
        timesheet_count = 0

        # Create 6 timesheets across different employees and periods
        active_employees = [e for e in employees if e.status == "active"][:6]
        statuses = ["draft", "draft", "submitted", "submitted", "approved", "approved"]

        for i, emp in enumerate(active_employees):
            # Calculate period (biweekly)
            weeks_ago = i * 2
            period_end = today - datetime.timedelta(days=today.weekday() + 1 + (weeks_ago * 7))
            period_start = period_end - datetime.timedelta(days=13)

            status = statuses[i]
            submitted_at = None

            if status in ("submitted", "approved"):
                submitted_at = timezone.make_aware(
                    datetime.datetime.combine(
                        period_end + datetime.timedelta(days=1),
                        datetime.time(9, 0),
                    )
                )

            Timesheet.objects.create(
                tenant=tenant,
                employee=emp,
                period_start=period_start,
                period_end=period_end,
                status=status,
                total_regular_hours=Decimal(random.randint(70, 85)),
                total_overtime_hours=Decimal(random.randint(0, 10)),
                total_break_hours=Decimal("10.0"),
                submitted_at=submitted_at,
                approved_at=submitted_at if status == "approved" else None,
            )
            timesheet_count += 1

        self.stdout.write(f"  Created {timesheet_count} timesheets")

    def _create_contracts(self, tenant, employees, contract_types):
        """Create contracts for all employees."""
        today = datetime.date.today()
        contract_count = 0

        ft_type = contract_types.get("FT", list(contract_types.values())[0])
        pt_type = contract_types.get("PT", ft_type)
        contr_type = contract_types.get("CONTR", ft_type)

        # Determine salary currency based on tenant
        try:
            currency = tenant.settings.currency
        except TenantSettings.DoesNotExist:
            currency = "USD"

        for i, emp in enumerate(employees):
            # Vary contract types
            if i < 20:
                ct = ft_type
                salary = Decimal(random.randint(40000, 120000))
                hours = Decimal("40.0")
            elif i < 23:
                ct = pt_type
                salary = Decimal(random.randint(20000, 50000))
                hours = Decimal("20.0")
            else:
                ct = contr_type
                salary = Decimal(random.randint(50, 150)) * Decimal("2080")  # Hourly to yearly
                hours = Decimal("40.0")

            # Vary contract status
            if i < 22:
                status = "active"
                end_date = today + datetime.timedelta(days=random.randint(180, 730))
            elif i < 24:
                # Expiring soon
                status = "active"
                end_date = today + datetime.timedelta(days=random.randint(7, 30))
            else:
                status = "draft"
                end_date = today + datetime.timedelta(days=365)

            Contract.objects.create(
                tenant=tenant,
                employee=emp,
                contract_type=ct,
                title=f"Employment Contract - {emp.full_name}",
                start_date=emp.hire_date,
                end_date=end_date,
                status=status,
                salary=salary,
                salary_currency=currency,
                salary_period="yearly",
                hours_per_week=hours,
                probation_end_date=emp.hire_date + datetime.timedelta(days=90),
                probation_passed=(today - emp.hire_date).days > 90,
            )
            contract_count += 1

        self.stdout.write(f"  Created {contract_count} contracts")

    def _sync_holidays(self, tenants):
        """Sync holidays for all demo tenants."""
        self.stdout.write("\nSyncing holidays...")

        for tenant in tenants:
            try:
                call_command("sync_holidays", tenant=tenant.slug, verbosity=0)
                self.stdout.write(f"  Synced holidays for {tenant.name}")
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f"  Failed to sync holidays for {tenant.name}: {e}")
                )

    def _print_login_info(self):
        """Print demo login credentials."""
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("DEMO LOGIN CREDENTIALS")
        self.stdout.write("=" * 60)
        self.stdout.write("\nUse these credentials to test the staging environment:\n")

        for user in DEMO_USERS:
            self.stdout.write(f"  Email:    {user['email']}")
            self.stdout.write(f"  Password: {user['password']}")
            self.stdout.write(f"  Role:     {user['role']}")
            self.stdout.write("")

        self.stdout.write("Available tenants: demo-acme, demo-techcorp, demo-global")
        self.stdout.write("=" * 60)
