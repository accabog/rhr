"""
Tests for contracts models.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.db import IntegrityError

from apps.contracts.models import Contract, ContractDocument, ContractType


@pytest.mark.django_db
class TestContractType:
    """Tests for ContractType model."""

    def test_create_contract_type(self, tenant):
        """Test creating a contract type."""
        ct = ContractType.objects.create(
            tenant=tenant,
            name="Full-time",
            code="FT",
            description="Full-time employment",
        )

        assert ct.name == "Full-time"
        assert ct.code == "FT"
        assert ct.is_active is True

    def test_str_representation(self, contract_type):
        """Test string representation."""
        assert str(contract_type) == "Full-time"

    def test_unique_code_per_tenant(self, tenant, contract_type):
        """Test code must be unique within tenant."""
        with pytest.raises(IntegrityError):
            ContractType.objects.create(
                tenant=tenant,
                name="Another Full-time",
                code="FT",  # Same code
            )

    def test_same_code_different_tenants(self, tenant, tenant2):
        """Test same code allowed in different tenants."""
        ct1 = ContractType.objects.create(
            tenant=tenant, name="Full-time", code="FT"
        )
        ct2 = ContractType.objects.create(
            tenant=tenant2, name="Full-time", code="FT"
        )

        assert ct1.code == ct2.code
        assert ct1.tenant != ct2.tenant


@pytest.mark.django_db
class TestContract:
    """Tests for Contract model."""

    def test_create_contract(self, tenant, employee, contract_type):
        """Test creating a contract."""
        contract = Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Employment Contract",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            salary=Decimal("50000.00"),
        )

        assert contract.status == "draft"
        assert contract.salary_currency == "USD"
        assert contract.salary_period == "monthly"
        assert contract.hours_per_week == Decimal("40.0")
        assert contract.notice_period_days == 30

    def test_str_representation(self, contract):
        """Test string representation."""
        assert str(contract.employee) in str(contract)

    def test_status_choices(self, tenant, employee, contract_type):
        """Test all status choices."""
        statuses = ["draft", "active", "expired", "terminated"]

        for i, status_val in enumerate(statuses):
            c = Contract.objects.create(
                tenant=tenant,
                employee=employee,
                contract_type=contract_type,
                title=f"Contract {i}",
                start_date=date.today() + timedelta(days=i * 365),
                status=status_val,
            )
            assert c.status == status_val

    def test_salary_periods(self, tenant, employee, contract_type):
        """Test all salary period choices."""
        periods = ["hourly", "daily", "weekly", "monthly", "yearly"]

        for i, period in enumerate(periods):
            c = Contract.objects.create(
                tenant=tenant,
                employee=employee,
                contract_type=contract_type,
                title=f"Contract {i}",
                start_date=date.today() + timedelta(days=i * 365),
                salary=Decimal("50000.00"),
                salary_period=period,
            )
            assert c.salary_period == period

    def test_probation_fields(self, tenant, employee, contract_type):
        """Test probation tracking fields."""
        contract = Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Employment Contract",
            start_date=date.today(),
            probation_end_date=date.today() + timedelta(days=90),
            probation_passed=False,
        )

        assert contract.probation_end_date is not None
        assert contract.probation_passed is False

        # Mark probation as passed
        contract.probation_passed = True
        contract.save()

        contract.refresh_from_db()
        assert contract.probation_passed is True

    def test_contract_without_end_date(self, tenant, employee, contract_type):
        """Test permanent contract without end date."""
        contract = Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Permanent Employment",
            start_date=date.today(),
            end_date=None,
        )

        assert contract.end_date is None

    def test_ordering(self, tenant, employee, contract_type):
        """Test default ordering (most recent start_date first)."""
        c1 = Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Contract 1",
            start_date=date(2022, 1, 1),
        )
        c2 = Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Contract 2",
            start_date=date(2024, 1, 1),
        )
        c3 = Contract.objects.create(
            tenant=tenant,
            employee=employee,
            contract_type=contract_type,
            title="Contract 3",
            start_date=date(2023, 1, 1),
        )

        contracts = list(Contract.objects.filter(tenant=tenant, employee=employee))
        assert contracts[0] == c2  # 2024 first
        assert contracts[1] == c3  # 2023
        assert contracts[2] == c1  # 2022


@pytest.mark.django_db
class TestContractDocument:
    """Tests for ContractDocument model."""

    def test_create_document(self, tenant, contract, employee):
        """Test creating a contract document."""
        doc = ContractDocument.objects.create(
            tenant=tenant,
            contract=contract,
            name="Signed Contract",
            file="contracts/test.pdf",
            uploaded_by=employee,
        )

        assert doc.name == "Signed Contract"
        assert doc.contract == contract
        assert doc.uploaded_by == employee

    def test_str_representation(self, tenant, contract, employee):
        """Test string representation."""
        doc = ContractDocument.objects.create(
            tenant=tenant,
            contract=contract,
            name="Agreement",
            file="contracts/test.pdf",
        )

        assert "Agreement" in str(doc)

    def test_documents_related_to_contract(self, tenant, contract, employee):
        """Test multiple documents per contract."""
        doc1 = ContractDocument.objects.create(
            tenant=tenant,
            contract=contract,
            name="Main Contract",
            file="contracts/main.pdf",
        )
        doc2 = ContractDocument.objects.create(
            tenant=tenant,
            contract=contract,
            name="Addendum",
            file="contracts/addendum.pdf",
        )

        assert contract.documents.count() == 2
        assert doc1 in contract.documents.all()
        assert doc2 in contract.documents.all()
