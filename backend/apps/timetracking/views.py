"""
Time tracking views.
"""

from datetime import date, datetime, time, timedelta
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

from .models import TimeEntry, TimeEntryType
from .serializers import (
    ClockInSerializer,
    ClockOutSerializer,
    TimeEntrySerializer,
    TimeEntrySummarySerializer,
    TimeEntryTypeSerializer,
    WeeklySummarySerializer,
)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class TimeEntryTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for TimeEntryType CRUD."""

    queryset = TimeEntryType.objects.all()
    serializer_class = TimeEntryTypeSerializer
    permission_classes = [IsTenantMember]
    pagination_class = None  # Return all types

    def get_queryset(self):
        if hasattr(self.request, "tenant") and self.request.tenant:
            return TimeEntryType.objects.filter(
                tenant=self.request.tenant, is_active=True
            )
        return TimeEntryType.objects.none()

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class TimeEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for TimeEntry CRUD with clock in/out actions."""

    queryset = TimeEntry.objects.select_related("employee", "entry_type")
    serializer_class = TimeEntrySerializer
    permission_classes = [IsTenantMember]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "entry_type", "date", "is_approved"]
    ordering_fields = ["date", "start_time", "created_at"]
    ordering = ["-date", "-start_time"]

    def get_queryset(self):
        if hasattr(self.request, "tenant") and self.request.tenant:
            queryset = TimeEntry.objects.filter(tenant=self.request.tenant)

            # Filter by date range
            start_date = self.request.query_params.get("start_date")
            end_date = self.request.query_params.get("end_date")

            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)

            return queryset.select_related("employee", "entry_type")
        return TimeEntry.objects.none()

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=False, methods=["get"])
    def my_entries(self, request):
        """Get current user's time entries."""
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        queryset = self.get_queryset().filter(employee=employee)

        # Apply date filters
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def current(self, request):
        """Get current active time entry (clocked in but not out)."""
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        active_entry = (
            self.get_queryset()
            .filter(employee=employee, date=date.today(), end_time__isnull=True)
            .first()
        )

        if active_entry:
            serializer = self.get_serializer(active_entry)
            return Response(serializer.data)

        return Response(None)

    @action(detail=False, methods=["post"])
    def clock_in(self, request):
        """Clock in - create a new time entry without end_time."""
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if already clocked in
        active_entry = TimeEntry.objects.filter(
            tenant=request.tenant,
            employee=employee,
            date=date.today(),
            end_time__isnull=True,
        ).first()

        if active_entry:
            return Response(
                {"detail": "Already clocked in", "entry": TimeEntrySerializer(active_entry).data},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ClockInSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # Get or create default entry type
        entry_type = serializer.validated_data.get("entry_type")
        if not entry_type:
            entry_type, _ = TimeEntryType.objects.get_or_create(
                tenant=request.tenant,
                code="REG",
                defaults={"name": "Regular", "is_paid": True, "multiplier": 1.0},
            )

        now = timezone.localtime()
        entry = TimeEntry.objects.create(
            tenant=request.tenant,
            employee=employee,
            entry_type=entry_type,
            date=now.date(),
            start_time=now.time(),
            notes=serializer.validated_data.get("notes", ""),
            project=serializer.validated_data.get("project", ""),
            task=serializer.validated_data.get("task", ""),
        )

        return Response(
            TimeEntrySerializer(entry).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"])
    def clock_out(self, request):
        """Clock out - update the current active entry with end_time."""
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        active_entry = TimeEntry.objects.filter(
            tenant=request.tenant,
            employee=employee,
            date=date.today(),
            end_time__isnull=True,
        ).first()

        if not active_entry:
            return Response(
                {"detail": "Not currently clocked in"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ClockOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        now = timezone.localtime()
        active_entry.end_time = now.time()
        active_entry.break_minutes = serializer.validated_data.get("break_minutes", 0)

        if serializer.validated_data.get("notes"):
            if active_entry.notes:
                active_entry.notes += "\n" + serializer.validated_data["notes"]
            else:
                active_entry.notes = serializer.validated_data["notes"]

        active_entry.save()

        return Response(TimeEntrySerializer(active_entry).data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get time entry summary for current user."""
        employee = self._get_current_employee(request)
        if not employee:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Default to current week
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        # Allow custom date range
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if start_date:
            week_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        if end_date:
            week_end = datetime.strptime(end_date, "%Y-%m-%d").date()

        entries = TimeEntry.objects.filter(
            tenant=request.tenant,
            employee=employee,
            date__gte=week_start,
            date__lte=week_end,
            end_time__isnull=False,  # Only completed entries
        )

        # Calculate totals
        total_minutes = 0
        regular_minutes = 0
        overtime_minutes = 0
        break_minutes = 0
        daily_data = {}

        for entry in entries:
            duration = entry.duration_minutes
            total_minutes += duration
            break_minutes += entry.break_minutes

            if entry.entry_type.code == "OT":
                overtime_minutes += duration
            else:
                regular_minutes += duration

            # Aggregate by date
            date_str = entry.date.isoformat()
            if date_str not in daily_data:
                daily_data[date_str] = {
                    "date": entry.date,
                    "total_hours": Decimal("0"),
                    "regular_hours": Decimal("0"),
                    "overtime_hours": Decimal("0"),
                    "break_hours": Decimal("0"),
                    "entries_count": 0,
                }

            daily_data[date_str]["total_hours"] += Decimal(duration) / 60
            daily_data[date_str]["break_hours"] += Decimal(entry.break_minutes) / 60
            daily_data[date_str]["entries_count"] += 1

            if entry.entry_type.code == "OT":
                daily_data[date_str]["overtime_hours"] += Decimal(duration) / 60
            else:
                daily_data[date_str]["regular_hours"] += Decimal(duration) / 60

        summary = {
            "week_start": week_start,
            "week_end": week_end,
            "total_hours": Decimal(total_minutes) / 60,
            "regular_hours": Decimal(regular_minutes) / 60,
            "overtime_hours": Decimal(overtime_minutes) / 60,
            "daily_breakdown": sorted(daily_data.values(), key=lambda x: x["date"]),
        }

        serializer = WeeklySummarySerializer(summary)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a time entry (manager action)."""
        entry = self.get_object()
        approver = self._get_current_employee(request)

        if not approver:
            return Response(
                {"detail": "No employee profile found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        entry.is_approved = True
        entry.approved_by = approver
        entry.approved_at = timezone.now()
        entry.save()

        return Response(TimeEntrySerializer(entry).data)

    def _get_current_employee(self, request):
        """Get the employee profile for the current user."""
        if not request.user.is_authenticated or not request.tenant:
            return None

        return Employee.objects.filter(
            tenant=request.tenant,
            user=request.user,
            status="active",
        ).first()
