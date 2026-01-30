"""
Timesheet serializers.
"""

from rest_framework import serializers

from apps.employees.models import Employee
from apps.timetracking.models import TimeEntry
from apps.timetracking.serializers import TimeEntrySerializer

from .models import Timesheet, TimesheetComment


class TimesheetCommentSerializer(serializers.ModelSerializer):
    """Serializer for TimesheetComment model."""

    author_name = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = TimesheetComment
        fields = [
            "id",
            "timesheet",
            "author",
            "author_name",
            "content",
            "created_at",
        ]
        read_only_fields = ["id", "timesheet", "author", "created_at"]


class TimesheetSerializer(serializers.ModelSerializer):
    """Serializer for Timesheet model with nested details."""

    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    approved_by_name = serializers.CharField(
        source="approved_by.full_name", read_only=True, allow_null=True
    )
    time_entries = serializers.SerializerMethodField()
    comments = TimesheetCommentSerializer(many=True, read_only=True)
    total_hours = serializers.SerializerMethodField()

    class Meta:
        model = Timesheet
        fields = [
            "id",
            "employee",
            "employee_name",
            "period_start",
            "period_end",
            "status",
            "total_regular_hours",
            "total_overtime_hours",
            "total_break_hours",
            "total_hours",
            "submitted_at",
            "approved_by",
            "approved_by_name",
            "approved_at",
            "rejection_reason",
            "time_entries",
            "comments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "submitted_at",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "total_regular_hours",
            "total_overtime_hours",
            "total_break_hours",
            "created_at",
            "updated_at",
        ]

    def get_time_entries(self, obj):
        """Get time entries within the timesheet period."""
        entries = TimeEntry.objects.filter(
            tenant=obj.tenant,
            employee=obj.employee,
            date__gte=obj.period_start,
            date__lte=obj.period_end,
        ).select_related("entry_type")
        return TimeEntrySerializer(entries, many=True).data

    def get_total_hours(self, obj):
        """Calculate total hours from regular + overtime."""
        return float(obj.total_regular_hours) + float(obj.total_overtime_hours)


class TimesheetListSerializer(serializers.ModelSerializer):
    """Lighter serializer for timesheet list views."""

    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    total_hours = serializers.SerializerMethodField()

    class Meta:
        model = Timesheet
        fields = [
            "id",
            "employee",
            "employee_name",
            "period_start",
            "period_end",
            "status",
            "total_regular_hours",
            "total_overtime_hours",
            "total_hours",
            "submitted_at",
            "approved_at",
            "created_at",
        ]

    def get_total_hours(self, obj):
        return float(obj.total_regular_hours) + float(obj.total_overtime_hours)


class GenerateTimesheetSerializer(serializers.Serializer):
    """Serializer for generating a timesheet from time entries."""

    period_start = serializers.DateField()
    period_end = serializers.DateField()
    employee_id = serializers.IntegerField(required=False)

    def validate(self, attrs):
        if attrs["period_end"] < attrs["period_start"]:
            raise serializers.ValidationError(
                {"period_end": "End date must be after start date"}
            )
        return attrs


class SubmitTimesheetSerializer(serializers.Serializer):
    """Serializer for submitting a timesheet."""

    notes = serializers.CharField(required=False, allow_blank=True)


class RejectTimesheetSerializer(serializers.Serializer):
    """Serializer for rejecting a timesheet."""

    reason = serializers.CharField(required=True, min_length=10)
