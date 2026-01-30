"""
Tests for contracts views.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from apps.contracts.models import Contract, ContractType


@pytest.mark.django_db
class TestContractTypeViewSet:
    """Tests for ContractType API endpoints."""

    def test_list_contract_types(
        self, authenticated_tenant_client, tenant, contract_type
    ):
        """Test listing contract types."""
        url = reverse("contracttype-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_create_contract_type(self, authenticated_tenant_client, tenant):
        """Test creating a contract type."""
        url = reverse("contracttype-list")
        data = {
            "name": "Contractor",
            "code": "CONTR",
            "description": "Independent contractor",
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Contractor"


@pytest.mark.django_db
class TestContractViewSet:
    """Tests for Contract API endpoints."""

    def test_list_contracts(
        self, authenticated_tenant_client, tenant, contract
    ):
        """Test listing contracts."""
        url = reverse("contract-list")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data

    def test_retrieve_contract(
        self, authenticated_tenant_client, tenant, contract
    ):
        """Test retrieving a single contract."""
        url = reverse("contract-detail", kwargs={"pk": contract.id})
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == contract.id

    def test_create_contract(
        self, authenticated_tenant_client, tenant, employee, contract_type
    ):
        """Test creating a contract."""
        url = reverse("contract-list")
        data = {
            "employee": employee.id,
            "contract_type": contract_type.id,
            "title": "New Employment Contract",
            "start_date": date.today().isoformat(),
            "end_date": (date.today() + timedelta(days=365)).isoformat(),
            "salary": "55000.00",
            "salary_period": "yearly",
        }

        response = authenticated_tenant_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "New Employment Contract"

    def test_filter_contracts_by_status(
        self, authenticated_tenant_client, tenant, contract, active_contract
    ):
        """Test filtering contracts by status."""
        url = reverse("contract-list")
        response = authenticated_tenant_client.get(url, {"status": "active"})

        for c in response.data["results"]:
            assert c["status"] == "active"

    def test_filter_contracts_by_employee(
        self, authenticated_tenant_client, tenant, contract, employee
    ):
        """Test filtering contracts by employee."""
        url = reverse("contract-list")
        response = authenticated_tenant_client.get(url, {"employee": employee.id})

        for c in response.data["results"]:
            assert c["employee"] == employee.id

    def test_search_contracts(
        self, authenticated_tenant_client, tenant, contract
    ):
        """Test searching contracts by title."""
        url = reverse("contract-list")
        response = authenticated_tenant_client.get(url, {"search": "Employment"})

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestContractWorkflow:
    """Tests for contract status transitions."""

    def test_activate_draft_contract(
        self, authenticated_tenant_client, tenant, contract
    ):
        """Test activating a draft contract."""
        assert contract.status == "draft"

        url = reverse("contract-activate", kwargs={"pk": contract.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "active"

        contract.refresh_from_db()
        assert contract.status == "active"

    def test_cannot_activate_non_draft(
        self, authenticated_tenant_client, tenant, active_contract
    ):
        """Test cannot activate a non-draft contract."""
        url = reverse("contract-activate", kwargs={"pk": active_contract.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only draft" in response.data["detail"]

    def test_terminate_active_contract(
        self, authenticated_tenant_client, tenant, active_contract
    ):
        """Test terminating an active contract."""
        url = reverse("contract-terminate", kwargs={"pk": active_contract.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "terminated"

    def test_cannot_terminate_non_active(
        self, authenticated_tenant_client, tenant, contract
    ):
        """Test cannot terminate a non-active contract."""
        url = reverse("contract-terminate", kwargs={"pk": contract.id})
        response = authenticated_tenant_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only active" in response.data["detail"]


@pytest.mark.django_db
class TestExpiringContracts:
    """Tests for expiring contracts endpoint."""

    def test_expiring_returns_contracts_within_30_days(
        self, authenticated_tenant_client, tenant, employee, contract_type
    ):
        """Test expiring endpoint returns contracts ending within 30 days."""
        # Create expiring contract
        expiring = Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Expiring Soon",
            start_date=date.today() - timedelta(days=335),
            end_date=date.today() + timedelta(days=15),
            status="active",
        )

        # Create non-expiring contract
        Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Long-term",
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=300),
            status="active",
        )

        url = reverse("contract-expiring")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Should only include the expiring contract
        ids = [c["id"] for c in response.data]
        assert expiring.id in ids

    def test_expiring_excludes_already_expired(
        self, authenticated_tenant_client, tenant, employee, contract_type
    ):
        """Test expiring excludes already expired contracts."""
        # Create expired contract
        Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Already Expired",
            start_date=date.today() - timedelta(days=400),
            end_date=date.today() - timedelta(days=5),
            status="active",
        )

        url = reverse("contract-expiring")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        for c in response.data:
            assert date.fromisoformat(c["end_date"]) >= date.today()

    def test_expiring_excludes_non_active(
        self, authenticated_tenant_client, tenant, employee, contract_type
    ):
        """Test expiring excludes non-active contracts."""
        # Create expiring but draft contract
        Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Draft Expiring",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=15),
            status="draft",
        )

        url = reverse("contract-expiring")
        response = authenticated_tenant_client.get(url)

        for c in response.data:
            assert c["status"] == "active"


@pytest.mark.django_db
class TestContractStats:
    """Tests for contract statistics endpoint."""

    def test_stats_returns_counts(
        self, authenticated_tenant_client, tenant, employee, contract_type
    ):
        """Test stats endpoint returns correct counts."""
        # Create contracts with different statuses
        Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Draft 1",
            start_date=date.today(),
            status="draft",
        )
        Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Active 1",
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=300),
            status="active",
        )
        Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Active Expiring",
            start_date=date.today() - timedelta(days=300),
            end_date=date.today() + timedelta(days=15),
            status="active",
        )

        url = reverse("contract-stats")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "total" in response.data
        assert "active" in response.data
        assert "draft" in response.data
        assert "expiring_soon" in response.data

        assert response.data["draft"] >= 1
        assert response.data["active"] >= 2
        assert response.data["expiring_soon"] >= 1


@pytest.mark.django_db
class TestMyContracts:
    """Tests for my_contracts endpoint."""

    def test_my_contracts_returns_own(
        self, authenticated_tenant_client, tenant, employee_with_user, contract_type
    ):
        """Test my_contracts returns current user's contracts."""
        contract = Contract.objects.create(
            tenant=tenant,
            employee=employee_with_user,
            contract_type=contract_type,
            title="My Contract",
            start_date=date.today(),
        )

        url = reverse("contract-my-contracts")
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        ids = [c["id"] for c in response.data["results"]]
        assert contract.id in ids


@pytest.mark.django_db
class TestContractDocuments:
    """Tests for contract documents endpoint."""

    def test_list_documents(
        self, authenticated_tenant_client, tenant, contract, employee
    ):
        """Test listing contract documents."""
        from apps.contracts.models import ContractDocument

        ContractDocument.objects.create(
            tenant=tenant,
            contract=contract,
            name="Contract PDF",
            file="contracts/contract.pdf",
            uploaded_by=employee,
        )

        url = reverse("contract-documents", kwargs={"pk": contract.id})
        response = authenticated_tenant_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert response.data[0]["name"] == "Contract PDF"
