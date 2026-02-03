"""
Tests for core views - health check, dashboard stats, and documents.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.contenttypes.models import ContentType
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestHealthCheckView:
    """Tests for the health check endpoint."""

    def test_health_check_returns_healthy(self, api_client):
        """Test health check endpoint returns healthy status."""
        url = reverse("health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "healthy"
        assert response.data["service"] == "rhr-backend"

    def test_health_check_no_auth_required(self, api_client):
        """Test health check works without authentication."""
        url = reverse("health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestDashboardStatsView:
    """Tests for dashboard statistics endpoint."""

    def test_dashboard_stats_requires_auth(self, api_client):
        """Test dashboard stats requires authentication."""
        url = reverse("dashboard-stats")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_dashboard_stats_requires_tenant(self, authenticated_client):
        """Test dashboard stats requires tenant context."""
        url = reverse("dashboard-stats")
        response = authenticated_client.get(url)

        # Should fail without tenant header
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]

    def test_dashboard_stats_returns_all_stats(
        self, authenticated_tenant_client, tenant, employee
    ):
        """Test dashboard stats returns all expected fields."""
        url = reverse("dashboard-stats")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "total_employees" in response.data
        assert "active_employees" in response.data
        assert "on_leave_employees" in response.data
        assert "departments_count" in response.data
        assert "positions_count" in response.data
        assert "pending_leave_requests" in response.data
        assert "expiring_contracts" in response.data
        assert "recent_hires" in response.data

    def test_dashboard_stats_employee_count(
        self, authenticated_tenant_client, tenant, employee, department, position
    ):
        """Test dashboard correctly counts employees."""
        from apps.employees.models import Employee

        # Create additional employee
        Employee.objects.create(
            tenant=tenant,
            employee_id="EMP-002",
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com",
            department=department,
            position=position,
            hire_date=date.today(),
            status="active",
        )

        url = reverse("dashboard-stats")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_employees"] == 2
        assert response.data["active_employees"] == 2

    def test_dashboard_stats_on_leave_count(
        self, authenticated_tenant_client, tenant, department, position
    ):
        """Test dashboard correctly counts on-leave employees."""
        from apps.employees.models import Employee

        Employee.objects.create(
            tenant=tenant,
            employee_id="ON-LEAVE",
            first_name="On",
            last_name="Leave",
            email="onleave@example.com",
            department=department,
            position=position,
            hire_date=date.today(),
            status="on_leave",
        )

        url = reverse("dashboard-stats")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["on_leave_employees"] == 1

    def test_dashboard_stats_department_count(
        self, authenticated_tenant_client, tenant, department, department2
    ):
        """Test dashboard correctly counts departments."""
        url = reverse("dashboard-stats")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["departments_count"] == 2

    def test_dashboard_stats_pending_leave_requests(
        self, authenticated_tenant_client, tenant, leave_request
    ):
        """Test dashboard correctly counts pending leave requests."""
        url = reverse("dashboard-stats")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["pending_leave_requests"] == 1

    def test_dashboard_stats_expiring_contracts(
        self, authenticated_tenant_client, tenant, expiring_contract
    ):
        """Test dashboard correctly counts expiring contracts."""
        url = reverse("dashboard-stats")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["expiring_contracts"] == 1

    def test_dashboard_stats_recent_hires(
        self, authenticated_tenant_client, tenant, department, position
    ):
        """Test dashboard correctly counts recent hires."""
        from apps.employees.models import Employee

        # Create recent hire
        Employee.objects.create(
            tenant=tenant,
            employee_id="NEW-001",
            first_name="Recent",
            last_name="Hire",
            email="new@example.com",
            department=department,
            position=position,
            hire_date=date.today() - timedelta(days=5),
            status="active",
        )

        url = reverse("dashboard-stats")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["recent_hires"] >= 1

    def test_dashboard_stats_tenant_isolation(
        self, authenticated_tenant_client, tenant, employee, employee2
    ):
        """Test dashboard stats are scoped to current tenant."""
        url = reverse("dashboard-stats")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Should only count employees in the current tenant
        assert response.data["total_employees"] == 1


@pytest.mark.django_db
class TestDocumentViewSet:
    """Tests for Document CRUD operations."""

    def test_list_documents_requires_auth(self, api_client):
        """Test document list requires authentication."""
        url = reverse("document-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_documents_requires_tenant(self, authenticated_client):
        """Test document list requires tenant context."""
        url = reverse("document-list")
        response = authenticated_client.get(url)

        # Without tenant header, should get empty or forbidden
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]
        if response.status_code == status.HTTP_200_OK:
            assert response.data["count"] == 0

    def test_list_documents_empty(self, authenticated_tenant_client, tenant):
        """Test listing documents when none exist."""
        url = reverse("document-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0

    def test_upload_document(
        self, authenticated_tenant_client, tenant, employee_with_user, tmp_path, settings
    ):
        """Test uploading a document."""
        # Use temp path for media storage
        settings.MEDIA_ROOT = str(tmp_path)

        url = reverse("document-list")

        # Create a simple test file
        file_content = b"test file content"
        test_file = SimpleUploadedFile(
            "test_document.txt",
            file_content,
            content_type="text/plain"
        )

        data = {
            "name": "Test Document",
            "file": test_file,
            "content_type_model": "employee",
            "object_id": employee_with_user.id,
            "description": "A test document",
        }

        response = authenticated_tenant_client.post(url, data, format="multipart")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Test Document"

    def test_filter_documents_by_entity(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test filtering documents by entity type and ID."""
        from apps.core.models import Document

        ct = ContentType.objects.get_for_model(employee_with_user)

        # Create document for employee
        Document.objects.create(
            tenant=tenant,
            name="Employee Doc",
            original_filename="test.txt",
            file="documents/test.txt",
            file_size=100,
            mime_type="text/plain",
            content_type=ct,
            object_id=employee_with_user.id,
        )

        url = reverse("document-list")
        response = authenticated_tenant_client.get(
            url,
            {"content_type": "employee", "object_id": employee_with_user.id}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_documents_tenant_isolation(
        self, authenticated_tenant_client, tenant, tenant2, employee
    ):
        """Test documents are filtered by tenant."""
        from apps.core.models import Document
        from apps.employees.models import Employee

        ct = ContentType.objects.get_for_model(employee)

        # Create document in tenant1
        Document.objects.create(
            tenant=tenant,
            name="Tenant 1 Doc",
            original_filename="t1.txt",
            file="documents/t1.txt",
            file_size=100,
            mime_type="text/plain",
            content_type=ct,
            object_id=employee.id,
        )

        # Create employee and document in tenant2
        from apps.employees.models import Department, Position
        dept2 = Department.objects.create(tenant=tenant2, name="Dept2", code="D2")
        pos2 = Position.objects.create(tenant=tenant2, title="Pos2", code="P2", department=dept2)
        emp2 = Employee.objects.create(
            tenant=tenant2,
            employee_id="T2-001",
            first_name="Tenant2",
            last_name="Employee",
            email="t2@example.com",
            department=dept2,
            position=pos2,
            hire_date=date.today(),
        )

        Document.objects.create(
            tenant=tenant2,
            name="Tenant 2 Doc",
            original_filename="t2.txt",
            file="documents/t2.txt",
            file_size=100,
            mime_type="text/plain",
            content_type=ct,
            object_id=emp2.id,
        )

        url = reverse("document-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Should only see tenant1's document
        for doc in response.data.get("results", []):
            assert doc["name"] != "Tenant 2 Doc"

    def test_document_by_entity_action(
        self, authenticated_tenant_client, tenant, employee_with_user
    ):
        """Test by_entity action endpoint."""
        from apps.core.models import Document

        ct = ContentType.objects.get_for_model(employee_with_user)

        Document.objects.create(
            tenant=tenant,
            name="Entity Doc",
            original_filename="entity.txt",
            file="documents/entity.txt",
            file_size=100,
            mime_type="text/plain",
            content_type=ct,
            object_id=employee_with_user.id,
        )

        url = reverse("document-by-entity")
        response = authenticated_tenant_client.get(
            url,
            {"content_type": "employee", "object_id": employee_with_user.id}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_by_entity_requires_params(self, authenticated_tenant_client, tenant):
        """Test by_entity action requires content_type and object_id."""
        url = reverse("document-by-entity")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "content_type" in response.data["detail"]

    def test_delete_document(self, authenticated_tenant_client, tenant, employee):
        """Test deleting a document."""
        from apps.core.models import Document

        ct = ContentType.objects.get_for_model(employee)

        doc = Document.objects.create(
            tenant=tenant,
            name="To Delete",
            original_filename="delete.txt",
            file="documents/delete.txt",
            file_size=100,
            mime_type="text/plain",
            content_type=ct,
            object_id=employee.id,
        )

        url = reverse("document-detail", kwargs={"pk": doc.id})
        response = authenticated_tenant_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Document.objects.filter(pk=doc.id).exists()

    def test_search_documents(self, authenticated_tenant_client, tenant, employee):
        """Test searching documents by name."""
        from apps.core.models import Document

        ct = ContentType.objects.get_for_model(employee)

        Document.objects.create(
            tenant=tenant,
            name="Important Contract",
            original_filename="contract.pdf",
            file="documents/contract.pdf",
            file_size=1024,
            mime_type="application/pdf",
            content_type=ct,
            object_id=employee.id,
        )

        url = reverse("document-list")
        response = authenticated_tenant_client.get(url, {"search": "Contract"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_invalid_content_type_filter(
        self, authenticated_tenant_client, tenant
    ):
        """Test filtering with invalid content type returns empty."""
        url = reverse("document-list")
        response = authenticated_tenant_client.get(
            url,
            {"content_type": "nonexistent", "object_id": 1}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0
