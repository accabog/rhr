"""
Employee views.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.core.permissions import IsTenantMember

from .models import Department, Employee, Position
from .serializers import (
    DepartmentSerializer,
    EmployeeDetailSerializer,
    EmployeeListSerializer,
    PositionSerializer,
)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class TenantAwareViewSet(viewsets.ModelViewSet):
    """Base ViewSet that automatically filters by tenant."""

    permission_classes = [IsTenantMember]
    pagination_class = StandardPagination

    def get_queryset(self):
        """Filter queryset by current tenant."""
        queryset = super().get_queryset()
        if hasattr(self.request, "tenant") and self.request.tenant:
            return queryset.for_tenant(self.request.tenant)
        return queryset.none()

    def perform_create(self, serializer):
        """Set tenant on create."""
        serializer.save(tenant=self.request.tenant)


class DepartmentViewSet(TenantAwareViewSet):
    """ViewSet for Department CRUD."""

    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "parent"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]


class PositionViewSet(TenantAwareViewSet):
    """ViewSet for Position CRUD."""

    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "department", "level"]
    search_fields = ["title", "code"]
    ordering_fields = ["title", "level", "created_at"]


class EmployeeViewSet(TenantAwareViewSet):
    """ViewSet for Employee CRUD."""

    queryset = Employee.objects.select_related("department", "position", "manager")
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "department", "position", "manager"]
    search_fields = ["first_name", "last_name", "email", "employee_id"]
    ordering_fields = ["last_name", "first_name", "hire_date", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return EmployeeListSerializer
        return EmployeeDetailSerializer

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        """Get or update the current user's employee record."""
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        employee = self.get_queryset().filter(user=request.user).first()
        if not employee:
            return Response(
                {"detail": "No employee record found for current user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == "PATCH":
            serializer = EmployeeDetailSerializer(
                employee, data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = EmployeeDetailSerializer(employee)
        return Response(serializer.data)
