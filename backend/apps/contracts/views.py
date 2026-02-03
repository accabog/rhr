"""
Contract views.
"""

from datetime import date, timedelta

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.core.permissions import IsTenantMember
from apps.employees.models import Employee

from .models import Contract, ContractDocument, ContractType
from .serializers import (
    ContractCreateUpdateSerializer,
    ContractDocumentSerializer,
    ContractListSerializer,
    ContractSerializer,
    ContractTypeSerializer,
)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class ContractTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for ContractType CRUD."""

    queryset = ContractType.objects.all()
    serializer_class = ContractTypeSerializer
    permission_classes = [IsTenantMember]
    pagination_class = None

    def get_queryset(self):
        if hasattr(self.request, "tenant") and self.request.tenant:
            return ContractType.objects.filter(tenant=self.request.tenant, is_active=True)
        return ContractType.objects.none()

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class ContractViewSet(viewsets.ModelViewSet):
    """ViewSet for Contract CRUD."""

    queryset = Contract.objects.select_related("employee", "contract_type")
    serializer_class = ContractSerializer
    permission_classes = [IsTenantMember]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ["employee", "contract_type", "status"]
    ordering_fields = ["start_date", "end_date", "created_at"]
    ordering = ["-start_date"]
    search_fields = ["title", "employee__first_name", "employee__last_name"]

    def get_queryset(self):
        if hasattr(self.request, "tenant") and self.request.tenant:
            queryset = Contract.objects.filter(tenant=self.request.tenant)

            # Filter by expiring soon
            expiring_soon = self.request.query_params.get("expiring_soon")
            if expiring_soon and expiring_soon.lower() == "true":
                today = date.today()
                queryset = queryset.filter(
                    end_date__isnull=False,
                    end_date__gte=today,
                    end_date__lte=today + timedelta(days=30),
                )

            return queryset.select_related("employee", "contract_type")
        return Contract.objects.none()

    def get_serializer_class(self):
        if self.action == "list":
            return ContractListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return ContractCreateUpdateSerializer
        return ContractSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=False, methods=["get"])
    def my_contracts(self, request):
        """Get current user's contracts."""
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        queryset = self.get_queryset().filter(employee=employee)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ContractListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ContractListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def expiring(self, request):
        """Get contracts expiring within 30 days."""
        today = date.today()
        queryset = self.get_queryset().filter(
            status="active",
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=today + timedelta(days=30),
        )

        serializer = ContractListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get contract statistics."""
        queryset = self.get_queryset()
        today = date.today()

        total = queryset.count()
        active = queryset.filter(status="active").count()
        draft = queryset.filter(status="draft").count()
        expired = queryset.filter(status="expired").count()
        expiring_soon = queryset.filter(
            status="active",
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=today + timedelta(days=30),
        ).count()

        return Response({
            "total": total,
            "active": active,
            "draft": draft,
            "expired": expired,
            "expiring_soon": expiring_soon,
        })

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """Activate a draft contract."""
        contract = self.get_object()

        if contract.status != "draft":
            return Response(
                {"detail": "Only draft contracts can be activated"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contract.status = "active"
        contract.save()

        return Response(ContractSerializer(contract).data)

    @action(detail=True, methods=["post"])
    def terminate(self, request, pk=None):
        """Terminate an active contract."""
        contract = self.get_object()

        if contract.status != "active":
            return Response(
                {"detail": "Only active contracts can be terminated"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contract.status = "terminated"
        contract.save()

        return Response(ContractSerializer(contract).data)

    @action(detail=True, methods=["get", "post"])
    def documents(self, request, pk=None):
        """Get or upload documents for a contract."""
        contract = self.get_object()

        if request.method == "GET":
            documents = contract.documents.select_related("uploaded_by")
            serializer = ContractDocumentSerializer(
                documents, many=True, context={"request": request}
            )
            return Response(serializer.data)

        # POST - upload document
        employee = self._get_current_employee(request)

        serializer = ContractDocumentSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        document = ContractDocument.objects.create(
            tenant=request.tenant,
            contract=contract,
            name=serializer.validated_data["name"],
            file=serializer.validated_data["file"],
            uploaded_by=employee,
        )

        return Response(
            ContractDocumentSerializer(document, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def _get_current_employee(self, request):
        if not request.user.is_authenticated or not request.tenant:
            return None
        return Employee.objects.filter(
            tenant=request.tenant,
            user=request.user,
            status="active",
        ).first()


class ContractDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for ContractDocument CRUD."""

    queryset = ContractDocument.objects.select_related("contract", "uploaded_by")
    serializer_class = ContractDocumentSerializer
    permission_classes = [IsTenantMember]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["contract"]

    def get_queryset(self):
        if hasattr(self.request, "tenant") and self.request.tenant:
            return ContractDocument.objects.filter(
                tenant=self.request.tenant
            ).select_related("contract", "uploaded_by")
        return ContractDocument.objects.none()

    def perform_create(self, serializer):
        employee = None
        if self.request.user.is_authenticated:
            employee = Employee.objects.filter(
                tenant=self.request.tenant,
                user=self.request.user,
            ).first()

        serializer.save(tenant=self.request.tenant, uploaded_by=employee)
