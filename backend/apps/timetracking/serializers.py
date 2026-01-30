"""
Time tracking serializers.
"""

from datetime import date, datetime, time

from django.utils import timezone
from rest_framework import serializers

from apps.employees.models import Employee

from .models import TimeEntry, TimeEntryType


class TimeEntryTypeSerializer(serializers.ModelSerializer):
    """Serializer for TimeEntryType model."""

    class Meta:
        model = TimeEntryType
        fields = [
            "id",
            "name",
            "code",
            "is_paid",
            "multiplier",
            "color",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TimeEntrySerializer(serializers.ModelSerializer):
    """Serializer for TimeEntry model."""

    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    entry_type_name = serializers.CharField(source="entry_type.name", read_only=True)
    entry_type_color = serializers.CharField(source="entry_type.color", read_only=True)
    duration_hours = serializers.ReadOnlyField()
    duration_minutes = serializers.ReadOnlyField()

    class Meta:
        model = TimeEntry
        fields = [
            "id",
            "employee",
            "employee_name",
            "entry_type",
            "entry_type_name",
            "entry_type_color",
            "date",
            "start_time",
            "end_time",
            "break_minutes",
            "notes",
            "project",
            "task",
            "is_approved",
            "approved_by",
            "approved_at",
            "duration_hours",
            "duration_minutes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_approved",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]

    def validate_employee(self, value):
        """Validate employee belongs to current tenant."""
        request = self.context.get("request")
        if value and request and hasattr(request, "tenant") and request.tenant:
            if value.tenant != request.tenant:
                raise serializers.ValidationError("Employee not found in this tenant")
        return value

    def validate_entry_type(self, value):
        """Validate entry type belongs to current tenant."""
        request = self.context.get("request")
        if value and request and hasattr(request, "tenant") and request.tenant:
            if value.tenant != request.tenant:
                raise serializers.ValidationError("Invalid entry type for this tenant")
        return value

    def validate(self, attrs):
        # Validate end_time is after start_time
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time"}
            )

        return attrs


class ClockInSerializer(serializers.Serializer):
    """Serializer for clock in action."""

    entry_type = serializers.PrimaryKeyRelatedField(
        queryset=TimeEntryType.objects.all(),
        required=False,
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    project = serializers.CharField(required=False, allow_blank=True, max_length=255)
    task = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate_entry_type(self, value):
        request = self.context.get("request")
        if value and request and hasattr(request, "tenant"):
            if value.tenant != request.tenant:
                raise serializers.ValidationError("Invalid entry type for this tenant")
        return value


class ClockOutSerializer(serializers.Serializer):
    """Serializer for clock out action."""

    break_minutes = serializers.IntegerField(required=False, default=0, min_value=0)
    notes = serializers.CharField(required=False, allow_blank=True)


class TimeEntrySummarySerializer(serializers.Serializer):
    """Serializer for time entry summaries."""

    date = serializers.DateField()
    total_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    regular_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    overtime_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    break_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    entries_count = serializers.IntegerField()


class WeeklySummarySerializer(serializers.Serializer):
    """Serializer for weekly time summary."""

    week_start = serializers.DateField()
    week_end = serializers.DateField()
    total_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    regular_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    overtime_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    daily_breakdown = TimeEntrySummarySerializer(many=True)
