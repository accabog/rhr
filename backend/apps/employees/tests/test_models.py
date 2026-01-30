"""
Tests for employees models.
"""

from datetime import date

import pytest
from django.db import IntegrityError

from apps.employees.models import Department, Employee, Position


@pytest.mark.django_db
class TestDepartment:
    """Tests for Department model."""

    def test_create_department(self, tenant):
        """Test creating a department."""
        dept = Department.objects.create(
            tenant=tenant,
            name="Engineering",
            code="ENG",
            description="Engineering department",
        )

        assert dept.name == "Engineering"
        assert dept.code == "ENG"
        assert dept.is_active is True
        assert dept.parent is None
        assert dept.manager is None

    def test_str_representation(self, department):
        """Test string representation."""
        assert str(department) == "Engineering"

    def test_unique_code_per_tenant(self, tenant, department):
        """Test code must be unique within tenant."""
        with pytest.raises(IntegrityError):
            Department.objects.create(
                tenant=tenant,
                name="Other Dept",
                code="ENG",  # Same code
            )

    def test_same_code_different_tenants(self, tenant, tenant2):
        """Test same code allowed in different tenants."""
        d1 = Department.objects.create(tenant=tenant, name="Eng", code="ENG")
        d2 = Department.objects.create(tenant=tenant2, name="Eng", code="ENG")

        assert d1.code == d2.code
        assert d1.tenant != d2.tenant

    def test_parent_child_relationship(self, tenant, department):
        """Test department hierarchy."""
        child = Department.objects.create(
            tenant=tenant,
            name="Backend Team",
            code="ENG-BE",
            parent=department,
        )

        assert child.parent == department
        assert department.children.count() == 1
        assert department.children.first() == child

    def test_nested_hierarchy(self, tenant, department, child_department):
        """Test multi-level hierarchy."""
        grandchild = Department.objects.create(
            tenant=tenant,
            name="Python Team",
            code="ENG-BE-PY",
            parent=child_department,
        )

        assert grandchild.parent == child_department
        assert child_department.parent == department
        assert grandchild.parent.parent == department

    def test_department_manager(self, tenant, department, employee):
        """Test department can have a manager."""
        department.manager = employee
        department.save()

        department.refresh_from_db()
        assert department.manager == employee
        assert employee.managed_departments.first() == department

    def test_ordering(self, tenant):
        """Test default ordering by name."""
        d1 = Department.objects.create(tenant=tenant, name="Zulu", code="Z")
        d2 = Department.objects.create(tenant=tenant, name="Alpha", code="A")
        d3 = Department.objects.create(tenant=tenant, name="Beta", code="B")

        depts = list(Department.objects.filter(tenant=tenant))
        assert depts[0] == d2  # Alpha
        assert depts[1] == d3  # Beta
        assert depts[2] == d1  # Zulu


@pytest.mark.django_db
class TestPosition:
    """Tests for Position model."""

    def test_create_position(self, tenant, department):
        """Test creating a position."""
        pos = Position.objects.create(
            tenant=tenant,
            title="Software Engineer",
            code="SWE",
            department=department,
            level=3,
        )

        assert pos.title == "Software Engineer"
        assert pos.code == "SWE"
        assert pos.level == 3
        assert pos.is_active is True

    def test_str_representation(self, position):
        """Test string representation."""
        assert str(position) == "Software Engineer"

    def test_level_hierarchy(self, tenant, department):
        """Test position levels."""
        junior = Position.objects.create(
            tenant=tenant,
            title="Junior Engineer",
            code="JE",
            department=department,
            level=1,
        )
        senior = Position.objects.create(
            tenant=tenant,
            title="Senior Engineer",
            code="SE",
            department=department,
            level=4,
        )
        lead = Position.objects.create(
            tenant=tenant,
            title="Tech Lead",
            code="TL",
            department=department,
            level=5,
        )

        assert junior.level < senior.level < lead.level

    def test_position_without_department(self, tenant):
        """Test position can exist without department."""
        pos = Position.objects.create(
            tenant=tenant,
            title="Consultant",
            code="CONS",
            department=None,
        )

        assert pos.department is None

    def test_ordering(self, tenant, department):
        """Test default ordering by title."""
        p1 = Position.objects.create(tenant=tenant, title="Zulu", code="Z")
        p2 = Position.objects.create(tenant=tenant, title="Alpha", code="A")
        p3 = Position.objects.create(tenant=tenant, title="Beta", code="B")

        positions = list(Position.objects.filter(tenant=tenant))
        assert positions[0] == p2  # Alpha
        assert positions[1] == p3  # Beta
        assert positions[2] == p1  # Zulu


@pytest.mark.django_db
class TestEmployee:
    """Tests for Employee model."""

    def test_create_employee(self, tenant, department, position):
        """Test creating an employee."""
        emp = Employee.objects.create(
            tenant=tenant,
            employee_id="EMP-100",
            first_name="John",
            last_name="Smith",
            email="john.smith@example.com",
            department=department,
            position=position,
            hire_date=date(2023, 1, 15),
        )

        assert emp.first_name == "John"
        assert emp.last_name == "Smith"
        assert emp.status == "active"
        assert emp.user is None

    def test_str_representation(self, employee):
        """Test string representation."""
        assert str(employee) == "John Doe"

    def test_full_name_property(self, employee):
        """Test full_name property."""
        assert employee.full_name == "John Doe"

    def test_unique_employee_id_per_tenant(self, tenant, employee):
        """Test employee_id must be unique within tenant."""
        with pytest.raises(IntegrityError):
            Employee.objects.create(
                tenant=tenant,
                employee_id="EMP-001",  # Same as employee fixture
                first_name="Jane",
                last_name="Doe",
                email="jane@example.com",
                hire_date=date.today(),
            )

    def test_same_employee_id_different_tenants(self, tenant, tenant2):
        """Test same employee_id allowed in different tenants."""
        e1 = Employee.objects.create(
            tenant=tenant,
            employee_id="EMP-001",
            first_name="John",
            last_name="Tenant1",
            email="john@tenant1.com",
            hire_date=date.today(),
        )
        e2 = Employee.objects.create(
            tenant=tenant2,
            employee_id="EMP-001",
            first_name="John",
            last_name="Tenant2",
            email="john@tenant2.com",
            hire_date=date.today(),
        )

        assert e1.employee_id == e2.employee_id
        assert e1.tenant != e2.tenant

    def test_employment_status_choices(self, tenant, department, position):
        """Test all employment status choices."""
        statuses = ["active", "on_leave", "terminated", "suspended"]

        for i, status_val in enumerate(statuses):
            emp = Employee.objects.create(
                tenant=tenant,
                employee_id=f"EMP-{i}",
                first_name="Test",
                last_name=f"Employee{i}",
                email=f"test{i}@example.com",
                department=department,
                position=position,
                hire_date=date.today(),
                status=status_val,
            )
            assert emp.status == status_val

    def test_employee_with_user(self, user, tenant, department, position):
        """Test employee linked to user account."""
        emp = Employee.objects.create(
            tenant=tenant,
            user=user,
            employee_id="EMP-USER",
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            department=department,
            position=position,
            hire_date=date.today(),
        )

        assert emp.user == user
        assert user.employee_profiles.first() == emp

    def test_manager_relationship(self, tenant, employee, manager_employee):
        """Test employee-manager relationship."""
        employee.manager = manager_employee
        employee.save()

        employee.refresh_from_db()
        assert employee.manager == manager_employee
        assert manager_employee.direct_reports.first() == employee

    def test_manager_hierarchy(self, tenant, department, position, manager_position):
        """Test multi-level manager hierarchy."""
        director = Employee.objects.create(
            tenant=tenant,
            employee_id="DIR-001",
            first_name="Director",
            last_name="Person",
            email="director@example.com",
            department=department,
            position=manager_position,
            hire_date=date(2020, 1, 1),
        )
        manager = Employee.objects.create(
            tenant=tenant,
            employee_id="MGR-001",
            first_name="Manager",
            last_name="Person",
            email="manager@example.com",
            department=department,
            position=manager_position,
            hire_date=date(2021, 1, 1),
            manager=director,
        )
        employee = Employee.objects.create(
            tenant=tenant,
            employee_id="EMP-NEW",
            first_name="Employee",
            last_name="Person",
            email="employee@example.com",
            department=department,
            position=position,
            hire_date=date(2022, 1, 1),
            manager=manager,
        )

        assert employee.manager == manager
        assert employee.manager.manager == director
        assert director.direct_reports.first() == manager
        assert manager.direct_reports.first() == employee

    def test_termination_date(self, tenant, department, position):
        """Test employee with termination date."""
        emp = Employee.objects.create(
            tenant=tenant,
            employee_id="EMP-TERM",
            first_name="Former",
            last_name="Employee",
            email="former@example.com",
            department=department,
            position=position,
            hire_date=date(2020, 1, 1),
            termination_date=date(2023, 6, 30),
            status="terminated",
        )

        assert emp.termination_date == date(2023, 6, 30)
        assert emp.status == "terminated"

    def test_ordering(self, tenant, department, position):
        """Test default ordering by last_name, first_name."""
        e1 = Employee.objects.create(
            tenant=tenant,
            employee_id="E1",
            first_name="Zara",
            last_name="Adams",
            email="zara@example.com",
            hire_date=date.today(),
        )
        e2 = Employee.objects.create(
            tenant=tenant,
            employee_id="E2",
            first_name="Adam",
            last_name="Smith",
            email="adam@example.com",
            hire_date=date.today(),
        )
        e3 = Employee.objects.create(
            tenant=tenant,
            employee_id="E3",
            first_name="Bob",
            last_name="Adams",
            email="bob@example.com",
            hire_date=date.today(),
        )

        employees = list(
            Employee.objects.filter(tenant=tenant, employee_id__in=["E1", "E2", "E3"])
        )
        # Sorted by last_name then first_name
        assert employees[0] == e3  # Adams, Bob
        assert employees[1] == e1  # Adams, Zara
        assert employees[2] == e2  # Smith, Adam
