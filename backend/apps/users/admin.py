from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import GoogleAccount, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "first_name", "last_name", "is_staff", "is_active"]
    list_filter = ["is_staff", "is_superuser", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["email"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "avatar")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    readonly_fields = ["created_at", "updated_at", "last_login"]

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2"),
            },
        ),
    )


@admin.register(GoogleAccount)
class GoogleAccountAdmin(admin.ModelAdmin):
    list_display = ["user", "google_email", "google_id", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__email", "google_email", "google_id"]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["user"]
