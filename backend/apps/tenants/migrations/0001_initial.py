# Generated manually for RHR project

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Tenant",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=255)),
                ("slug", models.SlugField(max_length=100, unique=True)),
                (
                    "domain",
                    models.CharField(blank=True, max_length=255, null=True, unique=True),
                ),
                ("is_active", models.BooleanField(default=True)),
                (
                    "logo",
                    models.ImageField(blank=True, null=True, upload_to="tenant_logos/"),
                ),
                (
                    "plan",
                    models.CharField(
                        choices=[
                            ("free", "Free"),
                            ("starter", "Starter"),
                            ("professional", "Professional"),
                            ("enterprise", "Enterprise"),
                        ],
                        default="free",
                        max_length=50,
                    ),
                ),
                ("max_employees", models.PositiveIntegerField(default=10)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="TenantSettings",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "work_hours_per_day",
                    models.DecimalField(decimal_places=2, default=8.0, max_digits=4),
                ),
                ("work_days_per_week", models.PositiveSmallIntegerField(default=5)),
                (
                    "overtime_multiplier",
                    models.DecimalField(decimal_places=2, default=1.5, max_digits=3),
                ),
                ("default_annual_leave_days", models.PositiveIntegerField(default=20)),
                ("default_sick_leave_days", models.PositiveIntegerField(default=10)),
                ("leave_approval_required", models.BooleanField(default=True)),
                (
                    "timesheet_period",
                    models.CharField(
                        choices=[
                            ("weekly", "Weekly"),
                            ("biweekly", "Bi-weekly"),
                            ("monthly", "Monthly"),
                        ],
                        default="biweekly",
                        max_length=20,
                    ),
                ),
                ("timesheet_approval_required", models.BooleanField(default=True)),
                ("timezone", models.CharField(default="UTC", max_length=50)),
                ("date_format", models.CharField(default="YYYY-MM-DD", max_length=20)),
                ("currency", models.CharField(default="USD", max_length=3)),
                (
                    "tenant",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="settings",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
        migrations.CreateModel(
            name="TenantMembership",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("owner", "Owner"),
                            ("admin", "Admin"),
                            ("manager", "Manager"),
                            ("employee", "Employee"),
                            ("viewer", "Viewer"),
                        ],
                        default="employee",
                        max_length=20,
                    ),
                ),
                (
                    "is_default",
                    models.BooleanField(
                        default=False, help_text="Default tenant for this user"
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="memberships",
                        to="tenants.tenant",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tenant_memberships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-is_default", "tenant__name"],
                "unique_together": {("user", "tenant")},
            },
        ),
    ]
