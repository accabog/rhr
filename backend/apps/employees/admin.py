from django.contrib import admin

from .models import Department, Employee, Position


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant", "code", "is_active"]
    list_filter = ["tenant", "is_active"]
    search_fields = ["name", "code"]


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ["title", "tenant", "department", "level", "is_active"]
    list_filter = ["tenant", "is_active", "level"]
    search_fields = ["title", "code"]


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ["full_name", "tenant", "employee_id", "department", "position", "status"]
    list_filter = ["tenant", "status", "department"]
    search_fields = ["first_name", "last_name", "email", "employee_id"]
