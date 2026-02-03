"""
Contract serializers.
"""

from rest_framework import serializers

from .models import Contract, ContractDocument, ContractType


class ContractTypeSerializer(serializers.ModelSerializer):
    """Serializer for ContractType model."""

    class Meta:
        model = ContractType
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ContractDocumentSerializer(serializers.ModelSerializer):
    """Serializer for ContractDocument model."""

    uploaded_by_name = serializers.CharField(
        source="uploaded_by.full_name", read_only=True, allow_null=True
    )
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ContractDocument
        fields = [
            "id",
            "contract",
            "name",
            "file",
            "file_url",
            "uploaded_by",
            "uploaded_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "uploaded_by", "created_at"]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class ContractSerializer(serializers.ModelSerializer):
    """Serializer for Contract model."""

    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    contract_type_name = serializers.CharField(
        source="contract_type.name", read_only=True
    )
    documents = ContractDocumentSerializer(many=True, read_only=True)
    is_expiring_soon = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            "id",
            "employee",
            "employee_name",
            "contract_type",
            "contract_type_name",
            "title",
            "start_date",
            "end_date",
            "status",
            "salary",
            "salary_currency",
            "salary_period",
            "hours_per_week",
            "probation_end_date",
            "probation_passed",
            "notice_period_days",
            "notes",
            "documents",
            "is_expiring_soon",
            "days_until_expiry",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_is_expiring_soon(self, obj):
        """Check if contract expires within 30 days."""
        from datetime import date, timedelta

        if not obj.end_date:
            return False
        today = date.today()
        return obj.end_date <= today + timedelta(days=30) and obj.end_date >= today

    def get_days_until_expiry(self, obj):
        """Get days until contract expires."""
        from datetime import date

        if not obj.end_date:
            return None
        delta = obj.end_date - date.today()
        return delta.days


class ContractListSerializer(serializers.ModelSerializer):
    """Lighter serializer for contract list views."""

    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    contract_type_name = serializers.CharField(
        source="contract_type.name", read_only=True
    )
    is_expiring_soon = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            "id",
            "employee",
            "employee_name",
            "contract_type",
            "contract_type_name",
            "title",
            "start_date",
            "end_date",
            "status",
            "salary",
            "salary_currency",
            "salary_period",
            "is_expiring_soon",
            "created_at",
        ]

    def get_is_expiring_soon(self, obj):
        from datetime import date, timedelta

        if not obj.end_date:
            return False
        today = date.today()
        return obj.end_date <= today + timedelta(days=30) and obj.end_date >= today


class ContractCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating contracts."""

    class Meta:
        model = Contract
        fields = [
            "employee",
            "contract_type",
            "title",
            "start_date",
            "end_date",
            "status",
            "salary",
            "salary_currency",
            "salary_period",
            "hours_per_week",
            "probation_end_date",
            "probation_passed",
            "notice_period_days",
            "notes",
        ]

    def validate(self, attrs):
        # Validate end_date is after start_date
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be after start date"}
            )

        # Validate probation_end_date
        probation_end = attrs.get("probation_end_date")
        if probation_end and start_date and probation_end < start_date:
            raise serializers.ValidationError(
                {"probation_end_date": "Probation end date must be after start date"}
            )

        return attrs
