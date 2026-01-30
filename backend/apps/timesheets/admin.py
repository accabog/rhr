from django.contrib import admin

from .models import Timesheet, TimesheetComment


@admin.register(Timesheet)
class TimesheetAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "tenant",
        "period_start",
        "period_end",
        "status",
        "total_regular_hours",
        "total_overtime_hours",
        "submitted_at",
        "approved_by",
    ]
    list_filter = ["tenant", "status", "period_start"]
    search_fields = ["employee__first_name", "employee__last_name"]
    date_hierarchy = "period_start"


@admin.register(TimesheetComment)
class TimesheetCommentAdmin(admin.ModelAdmin):
    list_display = ["timesheet", "author", "content", "created_at"]
    list_filter = ["tenant"]
    search_fields = ["content", "author__first_name", "author__last_name"]
