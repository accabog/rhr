"""
Core views - health checks and system endpoints.
"""

from datetime import date, timedelta

from django.contrib.contenttypes.models import ContentType
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsTenantMember

from .models import Document
from .serializers import DashboardStatsSerializer, DocumentSerializer, DocumentUploadSerializer


class HealthCheckView(APIView):
    """Health check endpoint for load balancers and monitoring."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(
            {"status": "healthy", "service": "rhr-backend"},
            status=status.HTTP_200_OK,
        )


class DashboardStatsView(APIView):
    """Dashboard statistics endpoint."""

    permission_classes = [IsAuthenticated, IsTenantMember]

    def get(self, request):
        from apps.contracts.models import Contract
        from apps.employees.models import Department, Employee, Position
        from apps.leave.models import LeaveRequest

        tenant = request.tenant
        if not tenant:
            return Response(
                {"detail": "No tenant context"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get date ranges
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        thirty_days_future = today + timedelta(days=30)

        # Employee stats
        employees = Employee.objects.filter(tenant=tenant)
        total_employees = employees.count()
        active_employees = employees.filter(status="active").count()
        on_leave_employees = employees.filter(status="on_leave").count()

        # Organization stats
        departments_count = Department.objects.filter(tenant=tenant, is_active=True).count()
        positions_count = Position.objects.filter(tenant=tenant, is_active=True).count()

        # Leave stats
        pending_leave_requests = LeaveRequest.objects.filter(
            tenant=tenant, status="pending"
        ).count()

        # Contract stats - expiring in next 30 days
        expiring_contracts = Contract.objects.filter(
            tenant=tenant,
            status="active",
            end_date__lte=thirty_days_future,
            end_date__gte=today,
        ).count()

        # Recent hires (last 30 days)
        recent_hires = employees.filter(hire_date__gte=thirty_days_ago).count()

        data = {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "on_leave_employees": on_leave_employees,
            "departments_count": departments_count,
            "positions_count": positions_count,
            "pending_leave_requests": pending_leave_requests,
            "expiring_contracts": expiring_contracts,
            "recent_hires": recent_hires,
        }

        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for document CRUD operations.

    Endpoints:
    - GET /documents/?content_type=employee&object_id=<id> - List documents for entity
    - POST /documents/ - Upload new document
    - GET /documents/<id>/ - Get document details
    - DELETE /documents/<id>/ - Remove document

    Documents are tenant-scoped and can be attached to any entity
    (Employee, LeaveRequest, Contract, etc.) using content_type filtering.
    """

    queryset = Document.objects.select_related("uploaded_by", "content_type")
    permission_classes = [IsAuthenticated, IsTenantMember]
    pagination_class = StandardPagination
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "original_filename", "description"]
    ordering_fields = ["name", "created_at", "file_size"]

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentUploadSerializer
        return DocumentSerializer

    def get_queryset(self):
        """Filter by tenant and optionally by content_type/object_id."""
        queryset = super().get_queryset()

        # Tenant filtering
        if hasattr(self.request, "tenant") and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        else:
            return queryset.none()

        # Filter by entity type and ID
        content_type_name = self.request.query_params.get("content_type")
        object_id = self.request.query_params.get("object_id")

        if content_type_name and object_id:
            try:
                ct = ContentType.objects.get(model=content_type_name.lower())
                queryset = queryset.filter(content_type=ct, object_id=object_id)
            except ContentType.DoesNotExist:
                return queryset.none()

        return queryset

    def perform_create(self, serializer):
        """Set tenant and uploader on document creation."""
        # Get current employee for uploaded_by
        from apps.employees.models import Employee

        uploaded_by = None
        if self.request.user.is_authenticated:
            uploaded_by = Employee.objects.filter(
                tenant=self.request.tenant, user=self.request.user
            ).first()

        serializer.save(tenant=self.request.tenant, uploaded_by=uploaded_by)

    @action(detail=False, methods=["get"])
    def by_entity(self, request):
        """
        Get documents for a specific entity.

        Query params:
        - content_type: Model name (e.g., 'employee', 'leaverequest')
        - object_id: Entity ID
        """
        content_type_name = request.query_params.get("content_type")
        object_id = request.query_params.get("object_id")

        if not content_type_name or not object_id:
            return Response(
                {"detail": "content_type and object_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = DocumentSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = DocumentSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)
