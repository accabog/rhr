"""
Timesheet views with approval workflow.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.core.permissions import IsTenantMember
from apps.employees.models import Employee
from apps.timetracking.models import TimeEntry

from .models import Timesheet, TimesheetComment
from .serializers import (
    GenerateTimesheetSerializer,
    RejectTimesheetSerializer,
    SubmitTimesheetSerializer,
    TimesheetCommentSerializer,
    TimesheetListSerializer,
    TimesheetSerializer,
)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class TimesheetViewSet(viewsets.ModelViewSet):
    """ViewSet for Timesheet CRUD with approval workflow."""

    queryset = Timesheet.objects.select_related("employee", "approved_by")
    serializer_class = TimesheetSerializer
    permission_classes = [IsTenantMember]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "status"]
    ordering_fields = ["period_start", "created_at", "submitted_at"]
    ordering = ["-period_start"]

    def get_queryset(self):
        if hasattr(self.request, "tenant") and self.request.tenant:
            queryset = Timesheet.objects.filter(tenant=self.request.tenant)

            # Filter by date range
            start_date = self.request.query_params.get("period_start")
            end_date = self.request.query_params.get("period_end")

            if start_date:
                queryset = queryset.filter(period_start__gte=start_date)
            if end_date:
                queryset = queryset.filter(period_end__lte=end_date)

            return queryset.select_related("employee", "approved_by")
        return Timesheet.objects.none()

    def get_serializer_class(self):
        if self.action == "list":
            return TimesheetListSerializer
        return TimesheetSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=False, methods=["get"])
    def my_timesheets(self, request):
        """Get current user's timesheets."""
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
            serializer = TimesheetListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TimesheetListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def pending_approval(self, request):
        """Get timesheets pending approval (for managers)."""
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get submitted timesheets (could add manager filtering here)
        queryset = self.get_queryset().filter(status="submitted")

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = TimesheetListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TimesheetListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """Generate a timesheet from time entries for a period."""
        serializer = GenerateTimesheetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        period_start = serializer.validated_data["period_start"]
        period_end = serializer.validated_data["period_end"]

        # Determine employee
        employee_id = serializer.validated_data.get("employee_id")
        if employee_id:
            employee = Employee.objects.filter(
                tenant=request.tenant, id=employee_id
            ).first()
            if not employee:
                return Response(
                    {"detail": "Employee not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            employee = self._get_current_employee(request)
            if not employee:
                return Response(
                    {"detail": "No employee profile found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Check if timesheet already exists
        existing = Timesheet.objects.filter(
            tenant=request.tenant,
            employee=employee,
            period_start=period_start,
        ).first()

        if existing:
            return Response(
                {"detail": "Timesheet already exists for this period", "id": existing.id},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate totals from time entries
        entries = TimeEntry.objects.filter(
            tenant=request.tenant,
            employee=employee,
            date__gte=period_start,
            date__lte=period_end,
            end_time__isnull=False,
        )

        regular_minutes = 0
        overtime_minutes = 0
        break_minutes = 0

        for entry in entries:
            duration = entry.duration_minutes
            break_minutes += entry.break_minutes

            if entry.entry_type and entry.entry_type.code == "OT":
                overtime_minutes += duration
            else:
                regular_minutes += duration

        timesheet = Timesheet.objects.create(
            tenant=request.tenant,
            employee=employee,
            period_start=period_start,
            period_end=period_end,
            total_regular_hours=Decimal(regular_minutes) / 60,
            total_overtime_hours=Decimal(overtime_minutes) / 60,
            total_break_hours=Decimal(break_minutes) / 60,
        )

        return Response(
            TimesheetSerializer(timesheet).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Submit timesheet for approval."""
        timesheet = self.get_object()

        if timesheet.status != "draft":
            return Response(
                {"detail": f"Cannot submit timesheet with status '{timesheet.status}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SubmitTimesheetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Recalculate totals before submission
        self._recalculate_totals(timesheet)

        timesheet.status = "submitted"
        timesheet.submitted_at = timezone.now()
        timesheet.save()

        # Add submission comment if provided
        notes = serializer.validated_data.get("notes")
        if notes:
            employee = self._get_current_employee(request)
            if employee:
                TimesheetComment.objects.create(
                    tenant=request.tenant,
                    timesheet=timesheet,
                    author=employee,
                    content=f"Submitted: {notes}",
                )

        return Response(TimesheetSerializer(timesheet).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a timesheet."""
        timesheet = self.get_object()
        approver = self._get_current_employee(request)

        if not approver:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if timesheet.status != "submitted":
            return Response(
                {"detail": "Only submitted timesheets can be approved"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        timesheet.status = "approved"
        timesheet.approved_by = approver
        timesheet.approved_at = timezone.now()
        timesheet.save()

        # Mark all time entries as approved
        TimeEntry.objects.filter(
            tenant=request.tenant,
            employee=timesheet.employee,
            date__gte=timesheet.period_start,
            date__lte=timesheet.period_end,
        ).update(is_approved=True, approved_by=approver, approved_at=timezone.now())

        # Add approval comment
        TimesheetComment.objects.create(
            tenant=request.tenant,
            timesheet=timesheet,
            author=approver,
            content="Timesheet approved",
        )

        return Response(TimesheetSerializer(timesheet).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject a timesheet."""
        timesheet = self.get_object()
        rejector = self._get_current_employee(request)

        if not rejector:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if timesheet.status != "submitted":
            return Response(
                {"detail": "Only submitted timesheets can be rejected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RejectTimesheetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        timesheet.status = "rejected"
        timesheet.rejection_reason = serializer.validated_data["reason"]
        timesheet.save()

        # Add rejection comment
        TimesheetComment.objects.create(
            tenant=request.tenant,
            timesheet=timesheet,
            author=rejector,
            content=f"Rejected: {serializer.validated_data['reason']}",
        )

        return Response(TimesheetSerializer(timesheet).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        """Reopen a rejected timesheet for editing."""
        timesheet = self.get_object()

        if timesheet.status != "rejected":
            return Response(
                {"detail": "Only rejected timesheets can be reopened"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        timesheet.status = "draft"
        timesheet.rejection_reason = ""
        timesheet.save()

        return Response(TimesheetSerializer(timesheet).data)

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, pk=None):
        """Get or add comments to a timesheet."""
        timesheet = self.get_object()

        if request.method == "GET":
            comments = timesheet.comments.select_related("author")
            serializer = TimesheetCommentSerializer(comments, many=True)
            return Response(serializer.data)

        # POST - add comment
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TimesheetCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = TimesheetComment.objects.create(
            tenant=request.tenant,
            timesheet=timesheet,
            author=employee,
            content=serializer.validated_data["content"],
        )

        return Response(
            TimesheetCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )

    def _get_current_employee(self, request):
        """Get the employee profile for the current user."""
        if not request.user.is_authenticated or not request.tenant:
            return None

        return Employee.objects.filter(
            tenant=request.tenant,
            user=request.user,
            status="active",
        ).first()

    def _recalculate_totals(self, timesheet):
        """Recalculate timesheet totals from time entries."""
        entries = TimeEntry.objects.filter(
            tenant=timesheet.tenant,
            employee=timesheet.employee,
            date__gte=timesheet.period_start,
            date__lte=timesheet.period_end,
            end_time__isnull=False,
        )

        regular_minutes = 0
        overtime_minutes = 0
        break_minutes = 0

        for entry in entries:
            duration = entry.duration_minutes
            break_minutes += entry.break_minutes

            if entry.entry_type and entry.entry_type.code == "OT":
                overtime_minutes += duration
            else:
                regular_minutes += duration

        timesheet.total_regular_hours = Decimal(regular_minutes) / 60
        timesheet.total_overtime_hours = Decimal(overtime_minutes) / 60
        timesheet.total_break_hours = Decimal(break_minutes) / 60
        timesheet.save()
