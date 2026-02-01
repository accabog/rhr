"""
API performance benchmarks using pytest-benchmark.

Run with: pytest tests/benchmarks/ -v --benchmark-only
"""

import pytest

pytestmark = [pytest.mark.django_db, pytest.mark.benchmark]


class TestEmployeeAPIPerformance:
    """Benchmarks for employee API endpoints."""

    def test_employee_list_performance(
        self, benchmark, authenticated_tenant_client, employee
    ):
        """Benchmark employee list endpoint."""
        result = benchmark(
            authenticated_tenant_client.get,
            '/api/v1/employees/'
        )
        assert result.status_code == 200

    def test_employee_detail_performance(
        self, benchmark, authenticated_tenant_client, employee
    ):
        """Benchmark employee detail endpoint."""
        result = benchmark(
            authenticated_tenant_client.get,
            f'/api/v1/employees/{employee.id}/'
        )
        assert result.status_code == 200


class TestLeaveAPIPerformance:
    """Benchmarks for leave API endpoints."""

    def test_leave_types_list_performance(
        self, benchmark, authenticated_tenant_client, leave_type
    ):
        """Benchmark leave types list endpoint."""
        result = benchmark(
            authenticated_tenant_client.get,
            '/api/v1/leave/types/'
        )
        assert result.status_code == 200

    def test_leave_requests_list_performance(
        self, benchmark, authenticated_tenant_client, leave_request
    ):
        """Benchmark leave requests list endpoint."""
        result = benchmark(
            authenticated_tenant_client.get,
            '/api/v1/leave/requests/'
        )
        assert result.status_code == 200


class TestQueryPerformance:
    """Benchmarks for database query performance."""

    def test_department_tree_query(self, benchmark, tenant, department):
        """Benchmark department tree query."""
        from apps.employees.models import Department

        def query():
            return list(Department.objects.for_tenant(tenant).select_related('parent'))

        result = benchmark(query)
        assert len(result) >= 1

    def test_employee_with_relations_query(self, benchmark, tenant, employee):
        """Benchmark employee query with related objects."""
        from apps.employees.models import Employee

        def query():
            return list(
                Employee.objects.for_tenant(tenant)
                .select_related('department', 'position', 'manager', 'user')
                .prefetch_related('direct_reports')
            )

        result = benchmark(query)
        assert len(result) >= 1
