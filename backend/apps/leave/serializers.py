"""
Leave management serializers.
"""

from rest_framework import serializers

from .models import Holiday, LeaveBalance, LeaveRequest, LeaveType


class LeaveTypeSerializer(serializers.ModelSerializer):
    """Serializer for LeaveType model."""

    class Meta:
        model = LeaveType
        fields = [
            "id",
            "name",
            "code",
            "is_paid",
            "requires_approval",
            "max_consecutive_days",
            "color",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LeaveBalanceSerializer(serializers.ModelSerializer):
    """Serializer for LeaveBalance model."""

    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    leave_type_color = serializers.CharField(source="leave_type.color", read_only=True)
    remaining_days = serializers.ReadOnlyField()

    class Meta:
        model = LeaveBalance
        fields = [
            "id",
            "employee",
            "employee_name",
            "leave_type",
            "leave_type_name",
            "leave_type_color",
            "year",
            "entitled_days",
            "used_days",
            "carried_over",
            "remaining_days",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "used_days", "created_at", "updated_at"]


class ExcludedHolidaySerializer(serializers.Serializer):
    """Serializer for holidays excluded from leave calculation."""

    date = serializers.DateField()
    name = serializers.CharField()


class LeaveRequestSerializer(serializers.ModelSerializer):
    """Serializer for LeaveRequest model."""

    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    leave_type_color = serializers.CharField(source="leave_type.color", read_only=True)
    reviewed_by_name = serializers.CharField(
        source="reviewed_by.full_name", read_only=True, allow_null=True
    )
    days_requested = serializers.ReadOnlyField()
    total_calendar_days = serializers.ReadOnlyField()
    holidays_excluded = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "employee",
            "employee_name",
            "leave_type",
            "leave_type_name",
            "leave_type_color",
            "start_date",
            "end_date",
            "is_half_day",
            "half_day_period",
            "reason",
            "status",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "review_notes",
            "days_requested",
            "total_calendar_days",
            "holidays_excluded",
            "created_at",
            "updated_at",
        ]

    def get_holidays_excluded(self, obj):
        """Return list of holidays excluded from this leave request."""
        holidays = obj.get_applicable_holidays()
        return ExcludedHolidaySerializer(holidays, many=True).data
        read_only_fields = [
            "id",
            "status",
            "reviewed_by",
            "reviewed_at",
            "review_notes",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        # Validate end_date is after start_date
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be on or after start date"}
            )

        # Validate half day
        is_half_day = attrs.get("is_half_day", False)
        half_day_period = attrs.get("half_day_period", "")

        if is_half_day:
            if start_date != end_date:
                raise serializers.ValidationError(
                    {"is_half_day": "Half day leave must be for a single day"}
                )
            if not half_day_period:
                raise serializers.ValidationError(
                    {"half_day_period": "Half day period is required for half day leave"}
                )

        return attrs


class LeaveRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating leave requests."""

    class Meta:
        model = LeaveRequest
        fields = [
            "leave_type",
            "start_date",
            "end_date",
            "is_half_day",
            "half_day_period",
            "reason",
        ]

    def validate(self, attrs):
        # Validate end_date is after start_date
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be on or after start date"}
            )

        # Validate half day
        is_half_day = attrs.get("is_half_day", False)
        half_day_period = attrs.get("half_day_period", "")

        if is_half_day:
            if start_date != end_date:
                raise serializers.ValidationError(
                    {"is_half_day": "Half day leave must be for a single day"}
                )
            if not half_day_period:
                raise serializers.ValidationError(
                    {"half_day_period": "Half day period is required for half day leave"}
                )

        return attrs


class ApproveRejectSerializer(serializers.Serializer):
    """Serializer for approving/rejecting leave requests."""

    notes = serializers.CharField(required=False, allow_blank=True)


class HolidaySerializer(serializers.ModelSerializer):
    """Serializer for Holiday model."""

    class Meta:
        model = Holiday
        fields = [
            "id",
            "name",
            "date",
            "is_recurring",
            "applies_to_all",
            "departments",
            "country",
            "source",
            "local_name",
            "holiday_types",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "source", "local_name", "holiday_types", "created_at", "updated_at"]


class LeaveBalanceSummarySerializer(serializers.Serializer):
    """Serializer for leave balance summary."""

    leave_type_id = serializers.IntegerField()
    leave_type_name = serializers.CharField()
    leave_type_color = serializers.CharField()
    entitled_days = serializers.DecimalField(max_digits=5, decimal_places=2)
    used_days = serializers.DecimalField(max_digits=5, decimal_places=2)
    remaining_days = serializers.DecimalField(max_digits=5, decimal_places=2)
    pending_days = serializers.DecimalField(max_digits=5, decimal_places=2)
