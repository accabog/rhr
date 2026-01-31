"""
Employee serializers.
"""

from rest_framework import serializers

from .models import Department, Employee, Position


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model."""

    children_count = serializers.SerializerMethodField()
    employees_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "code",
            "description",
            "parent",
            "manager",
            "country",
            "is_active",
            "children_count",
            "employees_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_children_count(self, obj):
        return obj.children.count()

    def get_employees_count(self, obj):
        return obj.employees.filter(status="active").count()


class PositionSerializer(serializers.ModelSerializer):
    """Serializer for Position model."""

    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Position
        fields = [
            "id",
            "title",
            "code",
            "description",
            "department",
            "department_name",
            "level",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EmployeeListSerializer(serializers.ModelSerializer):
    """Serializer for Employee list view (minimal fields)."""

    department_name = serializers.CharField(source="department.name", read_only=True)
    department_country = serializers.CharField(source="department.country", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True)
    manager_name = serializers.CharField(source="manager.full_name", read_only=True, default=None)
    full_name = serializers.ReadOnlyField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_id",
            "full_name",
            "first_name",
            "last_name",
            "email",
            "department",
            "department_name",
            "department_country",
            "position",
            "position_title",
            "manager",
            "manager_name",
            "status",
            "hire_date",
            "avatar",
            "timezone",
        ]

    def get_avatar(self, obj):
        """Return employee avatar, falling back to linked user's avatar."""
        request = self.context.get("request")
        if obj.avatar:
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        if obj.user and obj.user.avatar:
            return request.build_absolute_uri(obj.user.avatar.url) if request else obj.user.avatar.url
        return None


class EmployeeDetailSerializer(serializers.ModelSerializer):
    """Serializer for Employee detail view (all fields)."""

    department_name = serializers.CharField(source="department.name", read_only=True)
    department_country = serializers.CharField(source="department.country", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True)
    manager_name = serializers.CharField(source="manager.full_name", read_only=True)
    full_name = serializers.ReadOnlyField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_id",
            "full_name",
            "first_name",
            "last_name",
            "email",
            "phone",
            "avatar",
            "department",
            "department_name",
            "department_country",
            "position",
            "position_title",
            "manager",
            "manager_name",
            "hire_date",
            "termination_date",
            "status",
            "date_of_birth",
            "address",
            "emergency_contact_name",
            "emergency_contact_phone",
            "timezone",
            "user",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_avatar(self, obj):
        """Return employee avatar, falling back to linked user's avatar."""
        request = self.context.get("request")
        if obj.avatar:
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        if obj.user and obj.user.avatar:
            return request.build_absolute_uri(obj.user.avatar.url) if request else obj.user.avatar.url
        return None
