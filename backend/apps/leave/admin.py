from django.contrib import admin

from .models import Holiday, LeaveBalance, LeaveRequest, LeaveType


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant", "code", "is_paid", "requires_approval", "is_active"]
    list_filter = ["tenant", "is_paid", "requires_approval", "is_active"]
    search_fields = ["name", "code"]


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "tenant",
        "leave_type",
        "year",
        "entitled_days",
        "used_days",
        "remaining_days",
    ]
    list_filter = ["tenant", "leave_type", "year"]
    search_fields = ["employee__first_name", "employee__last_name"]


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "tenant",
        "leave_type",
        "start_date",
        "end_date",
        "status",
        "reviewed_by",
    ]
    list_filter = ["tenant", "leave_type", "status", "start_date"]
    search_fields = ["employee__first_name", "employee__last_name", "reason"]
    date_hierarchy = "start_date"


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant", "date", "is_recurring", "applies_to_all"]
    list_filter = ["tenant", "is_recurring", "applies_to_all"]
    search_fields = ["name"]
    date_hierarchy = "date"
