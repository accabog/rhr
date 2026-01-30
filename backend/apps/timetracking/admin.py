from django.contrib import admin

from .models import TimeEntry, TimeEntryType


@admin.register(TimeEntryType)
class TimeEntryTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant", "code", "is_paid", "multiplier", "is_active"]
    list_filter = ["tenant", "is_paid", "is_active"]
    search_fields = ["name", "code"]


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "tenant",
        "date",
        "start_time",
        "end_time",
        "entry_type",
        "is_approved",
    ]
    list_filter = ["tenant", "entry_type", "is_approved", "date"]
    search_fields = ["employee__first_name", "employee__last_name", "notes"]
    date_hierarchy = "date"
