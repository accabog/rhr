"""
Factory Boy factories for all RHR models.

These factories create test data with sensible defaults while allowing
customization for specific test scenarios.
"""

import datetime
from decimal import Decimal

import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory

User = get_user_model()


class UserFactory(DjangoModelFactory):
    """Factory for User model."""

    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    password = factory.PostGenerationMethodCall("set_password", "testpass123")
    is_active = True


class TenantFactory(DjangoModelFactory):
    """Factory for Tenant model."""

    class Meta:
        model = "tenants.Tenant"

    name = factory.Sequence(lambda n: f"Company {n}")
    slug = factory.Sequence(lambda n: f"company-{n}")
    is_active = True
    plan = "professional"
    max_employees = 100


class TenantMembershipFactory(DjangoModelFactory):
    """Factory for TenantMembership model."""

    class Meta:
        model = "tenants.TenantMembership"

    user = factory.SubFactory(UserFactory)
    tenant = factory.SubFactory(TenantFactory)
    role = "employee"
    is_default = True


class TenantSettingsFactory(DjangoModelFactory):
    """Factory for TenantSettings model."""

    class Meta:
        model = "tenants.TenantSettings"

    tenant = factory.SubFactory(TenantFactory)
    work_hours_per_day = Decimal("8.0")
    work_days_per_week = 5
    overtime_multiplier = Decimal("1.5")
    default_annual_leave_days = 20
    default_sick_leave_days = 10
    leave_approval_required = True
    timesheet_period = "biweekly"
    timesheet_approval_required = True
    timezone = "UTC"
    date_format = "YYYY-MM-DD"
    currency = "USD"


class DepartmentFactory(DjangoModelFactory):
    """Factory for Department model."""

    class Meta:
        model = "employees.Department"

    tenant = factory.SubFactory(TenantFactory)
    name = factory.Sequence(lambda n: f"Department {n}")
    code = factory.Sequence(lambda n: f"DEPT-{n:03d}")
    description = factory.Faker("sentence")
    parent = None
    manager = None
    is_active = True


class PositionFactory(DjangoModelFactory):
    """Factory for Position model."""

    class Meta:
        model = "employees.Position"

    tenant = factory.SubFactory(TenantFactory)
    title = factory.Sequence(lambda n: f"Position {n}")
    code = factory.Sequence(lambda n: f"POS-{n:03d}")
    description = factory.Faker("sentence")
    department = factory.SubFactory(
        DepartmentFactory, tenant=factory.SelfAttribute("..tenant")
    )
    level = 3
    is_active = True


class EmployeeFactory(DjangoModelFactory):
    """Factory for Employee model."""

    class Meta:
        model = "employees.Employee"

    tenant = factory.SubFactory(TenantFactory)
    user = None  # Optional - not all employees have user accounts
    employee_id = factory.Sequence(lambda n: f"EMP-{n:05d}")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    email = factory.LazyAttribute(
        lambda o: f"{o.first_name.lower()}.{o.last_name.lower()}@example.com"
    )
    phone = factory.Faker("phone_number")
    department = factory.SubFactory(
        DepartmentFactory, tenant=factory.SelfAttribute("..tenant")
    )
    position = factory.SubFactory(
        PositionFactory, tenant=factory.SelfAttribute("..tenant")
    )
    manager = None
    hire_date = factory.LazyFunction(lambda: datetime.date.today())
    termination_date = None
    status = "active"
    date_of_birth = factory.Faker(
        "date_of_birth", minimum_age=18, maximum_age=65
    )
    address = factory.Faker("address")
    emergency_contact_name = factory.Faker("name")
    emergency_contact_phone = factory.Faker("phone_number")

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Handle circular dependency with department when same tenant."""
        # Ensure department and position use the same tenant
        tenant = kwargs.get("tenant")
        if tenant and "department" not in kwargs:
            kwargs.setdefault("department", DepartmentFactory(tenant=tenant))
        if tenant and "position" not in kwargs:
            kwargs.setdefault("position", PositionFactory(tenant=tenant))
        return super()._create(model_class, *args, **kwargs)


class EmployeeWithUserFactory(EmployeeFactory):
    """Factory for Employee with linked User account."""

    user = factory.SubFactory(UserFactory)

    @factory.lazy_attribute
    def email(self):
        return self.user.email if self.user else f"{self.first_name.lower()}@example.com"


class TimeEntryTypeFactory(DjangoModelFactory):
    """Factory for TimeEntryType model."""

    class Meta:
        model = "timetracking.TimeEntryType"

    tenant = factory.SubFactory(TenantFactory)
    name = "Regular"
    code = "REG"
    is_paid = True
    multiplier = Decimal("1.0")
    color = "#3b82f6"
    is_active = True


class OvertimeEntryTypeFactory(TimeEntryTypeFactory):
    """Factory for overtime TimeEntryType."""

    name = "Overtime"
    code = "OT"
    multiplier = Decimal("1.5")
    color = "#f59e0b"


class TimeEntryFactory(DjangoModelFactory):
    """Factory for TimeEntry model."""

    class Meta:
        model = "timetracking.TimeEntry"

    tenant = factory.SubFactory(TenantFactory)
    employee = factory.SubFactory(
        EmployeeFactory, tenant=factory.SelfAttribute("..tenant")
    )
    entry_type = factory.SubFactory(
        TimeEntryTypeFactory, tenant=factory.SelfAttribute("..tenant")
    )
    date = factory.LazyFunction(lambda: datetime.date.today())
    start_time = factory.LazyFunction(lambda: datetime.time(9, 0))
    end_time = factory.LazyFunction(lambda: datetime.time(17, 0))
    break_minutes = 60
    notes = ""
    project = ""
    task = ""
    is_approved = False
    approved_by = None
    approved_at = None


class ActiveTimeEntryFactory(TimeEntryFactory):
    """Factory for currently active time entry (clocked in, not out)."""

    end_time = None
    break_minutes = 0


class LeaveTypeFactory(DjangoModelFactory):
    """Factory for LeaveType model."""

    class Meta:
        model = "leave.LeaveType"

    tenant = factory.SubFactory(TenantFactory)
    name = "Annual Leave"
    code = "ANNUAL"
    is_paid = True
    requires_approval = True
    max_consecutive_days = 14
    color = "#10b981"
    is_active = True


class SickLeaveTypeFactory(LeaveTypeFactory):
    """Factory for sick leave type."""

    name = "Sick Leave"
    code = "SICK"
    max_consecutive_days = None
    color = "#ef4444"


class LeaveBalanceFactory(DjangoModelFactory):
    """Factory for LeaveBalance model."""

    class Meta:
        model = "leave.LeaveBalance"

    tenant = factory.SubFactory(TenantFactory)
    employee = factory.SubFactory(
        EmployeeFactory, tenant=factory.SelfAttribute("..tenant")
    )
    leave_type = factory.SubFactory(
        LeaveTypeFactory, tenant=factory.SelfAttribute("..tenant")
    )
    year = factory.LazyFunction(lambda: datetime.date.today().year)
    entitled_days = Decimal("20.0")
    used_days = Decimal("0.0")
    carried_over = Decimal("0.0")


class LeaveRequestFactory(DjangoModelFactory):
    """Factory for LeaveRequest model."""

    class Meta:
        model = "leave.LeaveRequest"

    tenant = factory.SubFactory(TenantFactory)
    employee = factory.SubFactory(
        EmployeeFactory, tenant=factory.SelfAttribute("..tenant")
    )
    leave_type = factory.SubFactory(
        LeaveTypeFactory, tenant=factory.SelfAttribute("..tenant")
    )
    start_date = factory.LazyFunction(
        lambda: datetime.date.today() + datetime.timedelta(days=7)
    )
    end_date = factory.LazyFunction(
        lambda: datetime.date.today() + datetime.timedelta(days=9)
    )
    is_half_day = False
    half_day_period = ""
    reason = "Vacation"
    status = "pending"
    reviewed_by = None
    reviewed_at = None
    review_notes = ""


class HolidayFactory(DjangoModelFactory):
    """Factory for Holiday model."""

    class Meta:
        model = "leave.Holiday"

    tenant = factory.SubFactory(TenantFactory)
    name = factory.Sequence(lambda n: f"Holiday {n}")
    date = factory.LazyFunction(
        lambda: datetime.date.today() + datetime.timedelta(days=30)
    )
    is_recurring = False
    applies_to_all = True


class TimesheetFactory(DjangoModelFactory):
    """Factory for Timesheet model."""

    class Meta:
        model = "timesheets.Timesheet"

    tenant = factory.SubFactory(TenantFactory)
    employee = factory.SubFactory(
        EmployeeFactory, tenant=factory.SelfAttribute("..tenant")
    )
    period_start = factory.LazyFunction(
        lambda: datetime.date.today() - datetime.timedelta(days=14)
    )
    period_end = factory.LazyFunction(
        lambda: datetime.date.today() - datetime.timedelta(days=1)
    )
    status = "draft"
    total_regular_hours = Decimal("80.0")
    total_overtime_hours = Decimal("0.0")
    total_break_hours = Decimal("10.0")
    submitted_at = None
    approved_by = None
    approved_at = None
    rejection_reason = ""


class TimesheetCommentFactory(DjangoModelFactory):
    """Factory for TimesheetComment model."""

    class Meta:
        model = "timesheets.TimesheetComment"

    tenant = factory.SubFactory(TenantFactory)
    timesheet = factory.SubFactory(
        TimesheetFactory, tenant=factory.SelfAttribute("..tenant")
    )
    author = factory.SubFactory(
        EmployeeFactory, tenant=factory.SelfAttribute("..tenant")
    )
    content = factory.Faker("paragraph")


class ContractTypeFactory(DjangoModelFactory):
    """Factory for ContractType model."""

    class Meta:
        model = "contracts.ContractType"

    tenant = factory.SubFactory(TenantFactory)
    name = "Full-time"
    code = "FT"
    description = "Full-time employment contract"
    is_active = True


class PartTimeContractTypeFactory(ContractTypeFactory):
    """Factory for part-time contract type."""

    name = "Part-time"
    code = "PT"
    description = "Part-time employment contract"


class ContractorTypeFactory(ContractTypeFactory):
    """Factory for contractor contract type."""

    name = "Contractor"
    code = "CONTR"
    description = "Independent contractor agreement"


class ContractFactory(DjangoModelFactory):
    """Factory for Contract model."""

    class Meta:
        model = "contracts.Contract"

    tenant = factory.SubFactory(TenantFactory)
    employee = factory.SubFactory(
        EmployeeFactory, tenant=factory.SelfAttribute("..tenant")
    )
    contract_type = factory.SubFactory(
        ContractTypeFactory, tenant=factory.SelfAttribute("..tenant")
    )
    title = factory.LazyAttribute(lambda o: f"Employment Contract - {o.employee.full_name}")
    start_date = factory.LazyFunction(lambda: datetime.date.today())
    end_date = factory.LazyFunction(
        lambda: datetime.date.today() + datetime.timedelta(days=365)
    )
    status = "draft"
    salary = Decimal("50000.00")
    salary_currency = "USD"
    salary_period = "yearly"
    hours_per_week = Decimal("40.0")
    probation_end_date = factory.LazyFunction(
        lambda: datetime.date.today() + datetime.timedelta(days=90)
    )
    probation_passed = False
    notice_period_days = 30
    notes = ""


class ActiveContractFactory(ContractFactory):
    """Factory for active contracts."""

    status = "active"
    probation_passed = True


class ExpiringContractFactory(ActiveContractFactory):
    """Factory for contracts expiring within 30 days."""

    end_date = factory.LazyFunction(
        lambda: datetime.date.today() + datetime.timedelta(days=15)
    )


class ContractDocumentFactory(DjangoModelFactory):
    """Factory for ContractDocument model."""

    class Meta:
        model = "contracts.ContractDocument"

    tenant = factory.SubFactory(TenantFactory)
    contract = factory.SubFactory(
        ContractFactory, tenant=factory.SelfAttribute("..tenant")
    )
    name = factory.Sequence(lambda n: f"Document {n}")
    file = factory.django.FileField(filename="contract.pdf")
    uploaded_by = factory.SubFactory(
        EmployeeFactory, tenant=factory.SelfAttribute("..tenant")
    )
