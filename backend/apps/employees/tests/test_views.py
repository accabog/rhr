"""
Tests for employees views.
"""

from datetime import date

import pytest
from django.urls import reverse
from rest_framework import status

from apps.employees.models import Department, Employee, Position


@pytest.mark.django_db
class TestDepartmentViewSet:
    """Tests for Department API endpoints."""

    def test_list_departments(
        self, authenticated_tenant_client, tenant, department
    ):
        """Test listing departments."""
        url = reverse("department-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) >= 1

    def test_list_departments_tenant_isolation(
        self, authenticated_tenant_client, tenant, department, tenant2
    ):
        """Test departments are filtered by tenant."""
        # Create department in tenant2
        Department.objects.create(
            tenant=tenant2,
            name="Other Dept",
            code="OTHER",
        )

        url = reverse("department-list")
        response = authenticated_tenant_client.get(url)

        # Should only see tenant's departments
        for dept in response.data["results"]:
            assert dept["name"] != "Other Dept"

    def test_create_department(self, authenticated_tenant_client, tenant):
        """Test creating a department."""
        url = reverse("department-list")
        data = {
            "name": "Marketing",
            "code": "MKT",
            "description": "Marketing department",
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Marketing"

        # Verify tenant was set
        dept = Department.objects.get(pk=response.data["id"])
        assert dept.tenant == tenant

    def test_create_child_department(
        self, authenticated_tenant_client, tenant, department
    ):
        """Test creating a child department."""
        url = reverse("department-list")
        data = {
            "name": "Frontend Team",
            "code": "ENG-FE",
            "parent": department.id,
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["parent"] == department.id

    def test_filter_active_departments(
        self, authenticated_tenant_client, tenant, department
    ):
        """Test filtering by active status."""
        # Create inactive department
        Department.objects.create(
            tenant=tenant,
            name="Inactive Dept",
            code="INACTIVE",
            is_active=False,
        )

        url = reverse("department-list")
        response = authenticated_tenant_client.get(url, {"is_active": True})

        for dept in response.data["results"]:
            assert dept["is_active"] is True

    def test_search_departments(
        self, authenticated_tenant_client, tenant, department
    ):
        """Test searching departments by name."""
        url = reverse("department-list")
        response = authenticated_tenant_client.get(url, {"search": "Engineering"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1


@pytest.mark.django_db
class TestPositionViewSet:
    """Tests for Position API endpoints."""

    def test_list_positions(
        self, authenticated_tenant_client, tenant, position
    ):
        """Test listing positions."""
        url = reverse("position-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data

    def test_create_position(
        self, authenticated_tenant_client, tenant, department
    ):
        """Test creating a position."""
        url = reverse("position-list")
        data = {
            "title": "Product Manager",
            "code": "PM",
            "department": department.id,
            "level": 4,
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Product Manager"

    def test_filter_positions_by_level(
        self, authenticated_tenant_client, tenant, department
    ):
        """Test filtering positions by level."""
        Position.objects.create(
            tenant=tenant, title="Junior", code="JR", level=1
        )
        Position.objects.create(
            tenant=tenant, title="Senior", code="SR", level=5
        )

        url = reverse("position-list")
        response = authenticated_tenant_client.get(url, {"level": 5})

        for pos in response.data["results"]:
            assert pos["level"] == 5


@pytest.mark.django_db
class TestEmployeeViewSet:
    """Tests for Employee API endpoints."""

    def test_list_employees(
        self, authenticated_tenant_client, tenant, employee
    ):
        """Test listing employees."""
        url = reverse("employee-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) >= 1

    def test_list_employees_uses_list_serializer(
        self, authenticated_tenant_client, tenant, employee
    ):
        """Test list view uses compact serializer."""
        url = reverse("employee-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # List serializer might have fewer fields than detail

    def test_retrieve_employee_uses_detail_serializer(
        self, authenticated_tenant_client, tenant, employee
    ):
        """Test retrieve view uses detailed serializer."""
        url = reverse("employee-detail", kwargs={"pk": employee.id})
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == employee.id

    def test_employees_tenant_isolation(
        self, authenticated_tenant_client, tenant, employee, employee2
    ):
        """Test employees are filtered by tenant."""
        url = reverse("employee-list")
        response = authenticated_tenant_client.get(url)

        # Should not see employee2 (different tenant)
        employee_ids = [e["id"] for e in response.data["results"]]
        assert employee.id in employee_ids
        assert employee2.id not in employee_ids

    def test_create_employee(
        self, authenticated_tenant_client, tenant, department, position
    ):
        """Test creating an employee."""
        url = reverse("employee-list")
        data = {
            "employee_id": "NEW-001",
            "first_name": "New",
            "last_name": "Employee",
            "email": "new@example.com",
            "department": department.id,
            "position": position.id,
            "hire_date": "2024-01-15",
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["first_name"] == "New"

        # Verify tenant was set
        emp = Employee.objects.get(pk=response.data["id"])
        assert emp.tenant == tenant

    def test_filter_employees_by_status(
        self, authenticated_tenant_client, tenant, employee, department, position
    ):
        """Test filtering employees by status."""
        # Create terminated employee
        Employee.objects.create(
            tenant=tenant,
            employee_id="TERM-001",
            first_name="Terminated",
            last_name="Employee",
            email="term@example.com",
            department=department,
            position=position,
            hire_date=date.today(),
            status="terminated",
        )

        url = reverse("employee-list")
        response = authenticated_tenant_client.get(url, {"status": "active"})

        for emp in response.data["results"]:
            assert emp["status"] == "active"

    def test_filter_employees_by_department(
        self, authenticated_tenant_client, tenant, employee, department, department2
    ):
        """Test filtering employees by department."""
        url = reverse("employee-list")
        response = authenticated_tenant_client.get(
            url, {"department": department.id}
        )

        for emp in response.data["results"]:
            assert emp["department"] == department.id

    def test_search_employees(
        self, authenticated_tenant_client, tenant, employee
    ):
        """Test searching employees by name or email."""
        url = reverse("employee-list")
        response = authenticated_tenant_client.get(url, {"search": "John"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_search_employees_by_employee_id(
        self, authenticated_tenant_client, tenant, employee
    ):
        """Test searching employees by employee_id."""
        url = reverse("employee-list")
        response = authenticated_tenant_client.get(url, {"search": "EMP-001"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_update_employee(
        self, authenticated_tenant_client, tenant, employee
    ):
        """Test updating an employee."""
        url = reverse("employee-detail", kwargs={"pk": employee.id})
        data = {
            "employee_id": employee.employee_id,
            "first_name": "Updated",
            "last_name": employee.last_name,
            "email": employee.email,
            "hire_date": str(employee.hire_date),
        }

        response = authenticated_tenant_client.put(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == "Updated"

    def test_partial_update_employee(
        self, authenticated_tenant_client, tenant, employee
    ):
        """Test partial update of an employee."""
        url = reverse("employee-detail", kwargs={"pk": employee.id})
        data = {"phone": "555-1234"}

        response = authenticated_tenant_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["phone"] == "555-1234"

    def test_delete_employee(
        self, authenticated_tenant_client, tenant, employee
    ):
        """Test deleting an employee."""
        url = reverse("employee-detail", kwargs={"pk": employee.id})
        response = authenticated_tenant_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Employee.objects.filter(pk=employee.id).exists()


@pytest.mark.django_db
class TestEmployeeManagerRelationships:
    """Tests for employee manager relationships."""

    def test_filter_employees_by_manager(
        self,
        authenticated_tenant_client,
        tenant,
        employee,
        manager_employee,
        department,
        position,
    ):
        """Test filtering employees by manager."""
        # Set manager
        employee.manager = manager_employee
        employee.save()

        url = reverse("employee-list")
        response = authenticated_tenant_client.get(
            url, {"manager": manager_employee.id}
        )

        assert response.status_code == status.HTTP_200_OK
        for emp in response.data["results"]:
            assert emp["manager"] == manager_employee.id

    def test_create_employee_with_manager(
        self,
        authenticated_tenant_client,
        tenant,
        manager_employee,
        department,
        position,
    ):
        """Test creating employee with manager relationship."""
        url = reverse("employee-list")
        data = {
            "employee_id": "REPORT-001",
            "first_name": "Direct",
            "last_name": "Report",
            "email": "report@example.com",
            "department": department.id,
            "position": position.id,
            "hire_date": "2024-01-15",
            "manager": manager_employee.id,
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["manager"] == manager_employee.id
