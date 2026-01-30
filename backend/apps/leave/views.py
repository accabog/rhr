"""
Leave management views.
"""

from datetime import date
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.core.permissions import IsTenantMember
from apps.employees.models import Employee

from .models import Holiday, LeaveBalance, LeaveRequest, LeaveType
from .serializers import (
    ApproveRejectSerializer,
    HolidaySerializer,
    LeaveBalanceSerializer,
    LeaveBalanceSummarySerializer,
    LeaveRequestCreateSerializer,
    LeaveRequestSerializer,
    LeaveTypeSerializer,
)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class LeaveTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for LeaveType CRUD."""

    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsTenantMember]
    pagination_class = None

    def get_queryset(self):
        if hasattr(self.request, "tenant") and self.request.tenant:
            return LeaveType.objects.filter(tenant=self.request.tenant, is_active=True)
        return LeaveType.objects.none()

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    """ViewSet for LeaveBalance CRUD."""

    queryset = LeaveBalance.objects.select_related("employee", "leave_type")
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsTenantMember]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "leave_type", "year"]
    ordering_fields = ["year", "leave_type__name"]
    ordering = ["-year"]

    def get_queryset(self):
        if hasattr(self.request, "tenant") and self.request.tenant:
            return LeaveBalance.objects.filter(
                tenant=self.request.tenant
            ).select_related("employee", "leave_type")
        return LeaveBalance.objects.none()

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=False, methods=["get"])
    def my_balances(self, request):
        """Get current user's leave balances."""
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        year = request.query_params.get("year", date.today().year)
        balances = self.get_queryset().filter(employee=employee, year=year)

        serializer = self.get_serializer(balances, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get leave balance summary with pending requests."""
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        year = int(request.query_params.get("year", date.today().year))
        balances = self.get_queryset().filter(employee=employee, year=year)

        # Get pending leave requests
        pending_requests = LeaveRequest.objects.filter(
            tenant=request.tenant,
            employee=employee,
            status="pending",
            start_date__year=year,
        )

        # Calculate pending days per leave type
        pending_by_type = {}
        for req in pending_requests:
            if req.leave_type_id not in pending_by_type:
                pending_by_type[req.leave_type_id] = Decimal("0")
            pending_by_type[req.leave_type_id] += Decimal(str(req.days_requested))

        summary = []
        for balance in balances:
            pending_days = pending_by_type.get(balance.leave_type_id, Decimal("0"))
            summary.append({
                "leave_type_id": balance.leave_type_id,
                "leave_type_name": balance.leave_type.name,
                "leave_type_color": balance.leave_type.color,
                "entitled_days": balance.entitled_days,
                "used_days": balance.used_days,
                "remaining_days": balance.remaining_days,
                "pending_days": pending_days,
            })

        serializer = LeaveBalanceSummarySerializer(summary, many=True)
        return Response(serializer.data)

    def _get_current_employee(self, request):
        if not request.user.is_authenticated or not request.tenant:
            return None
        return Employee.objects.filter(
            tenant=request.tenant,
            user=request.user,
            status="active",
        ).first()


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for LeaveRequest CRUD with approval workflow."""

    queryset = LeaveRequest.objects.select_related(
        "employee", "leave_type", "reviewed_by"
    )
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsTenantMember]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "leave_type", "status"]
    ordering_fields = ["start_date", "created_at"]
    ordering = ["-start_date"]

    def get_queryset(self):
        if hasattr(self.request, "tenant") and self.request.tenant:
            queryset = LeaveRequest.objects.filter(tenant=self.request.tenant)

            # Filter by date range
            start_date = self.request.query_params.get("start_date")
            end_date = self.request.query_params.get("end_date")

            if start_date:
                queryset = queryset.filter(start_date__gte=start_date)
            if end_date:
                queryset = queryset.filter(end_date__lte=end_date)

            return queryset.select_related("employee", "leave_type", "reviewed_by")
        return LeaveRequest.objects.none()

    def get_serializer_class(self):
        if self.action == "create":
            return LeaveRequestCreateSerializer
        return LeaveRequestSerializer

    def create(self, request, *args, **kwargs):
        """Create leave request and return full serialized data."""
        employee = self._get_current_employee(request)
        if not employee:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "No employee profile found"})

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(tenant=request.tenant, employee=employee)

        # Return full serialized response
        response_serializer = LeaveRequestSerializer(instance)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def my_requests(self, request):
        """Get current user's leave requests."""
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        queryset = self.get_queryset().filter(employee=employee)

        # Apply status filter
        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def pending_approval(self, request):
        """Get leave requests pending approval (for managers)."""
        queryset = self.get_queryset().filter(status="pending")

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a leave request."""
        leave_request = self.get_object()
        reviewer = self._get_current_employee(request)

        if not reviewer:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if leave_request.status != "pending":
            return Response(
                {"detail": "Only pending requests can be approved"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ApproveRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        leave_request.status = "approved"
        leave_request.reviewed_by = reviewer
        leave_request.reviewed_at = timezone.now()
        leave_request.review_notes = serializer.validated_data.get("notes", "")
        leave_request.save()

        # Update leave balance
        self._update_leave_balance(leave_request, add=True)

        return Response(LeaveRequestSerializer(leave_request).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject a leave request."""
        leave_request = self.get_object()
        reviewer = self._get_current_employee(request)

        if not reviewer:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if leave_request.status != "pending":
            return Response(
                {"detail": "Only pending requests can be rejected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ApproveRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        leave_request.status = "rejected"
        leave_request.reviewed_by = reviewer
        leave_request.reviewed_at = timezone.now()
        leave_request.review_notes = serializer.validated_data.get("notes", "")
        leave_request.save()

        return Response(LeaveRequestSerializer(leave_request).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a leave request (by the employee)."""
        leave_request = self.get_object()
        employee = self._get_current_employee(request)

        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if leave_request.employee != employee:
            return Response(
                {"detail": "You can only cancel your own requests"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if leave_request.status not in ["pending", "approved"]:
            return Response(
                {"detail": "This request cannot be cancelled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If was approved, restore the balance
        if leave_request.status == "approved":
            self._update_leave_balance(leave_request, add=False)

        leave_request.status = "cancelled"
        leave_request.save()

        return Response(LeaveRequestSerializer(leave_request).data)

    @action(detail=False, methods=["get"])
    def calendar(self, request):
        """Get leave requests for calendar view."""
        # Get approved and pending requests for a date range
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if not start_date or not end_date:
            return Response(
                {"detail": "start_date and end_date are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.get_queryset().filter(
            status__in=["approved", "pending"],
            start_date__lte=end_date,
            end_date__gte=start_date,
        )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def _get_current_employee(self, request):
        if not request.user.is_authenticated or not request.tenant:
            return None
        return Employee.objects.filter(
            tenant=request.tenant,
            user=request.user,
            status="active",
        ).first()

    def _update_leave_balance(self, leave_request, add=True):
        """Update leave balance when request is approved/cancelled."""
        year = leave_request.start_date.year
        balance, created = LeaveBalance.objects.get_or_create(
            tenant=leave_request.tenant,
            employee=leave_request.employee,
            leave_type=leave_request.leave_type,
            year=year,
            defaults={"entitled_days": Decimal("0")},
        )

        days = Decimal(str(leave_request.days_requested))
        if add:
            balance.used_days += days
        else:
            balance.used_days -= days

        balance.save()


class HolidayViewSet(viewsets.ModelViewSet):
    """ViewSet for Holiday CRUD."""

    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    permission_classes = [IsTenantMember]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ["date"]
    ordering = ["date"]

    def get_queryset(self):
        if hasattr(self.request, "tenant") and self.request.tenant:
            queryset = Holiday.objects.filter(tenant=self.request.tenant)

            # Filter by year
            year = self.request.query_params.get("year")
            if year:
                queryset = queryset.filter(date__year=year)

            return queryset
        return Holiday.objects.none()

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """Get upcoming holidays."""
        today = date.today()
        queryset = self.get_queryset().filter(date__gte=today)[:10]

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
