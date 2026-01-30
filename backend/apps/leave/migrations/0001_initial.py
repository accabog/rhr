# Generated manually for RHR project

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("tenants", "0001_initial"),
        ("employees", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="LeaveType",
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
                ("name", models.CharField(max_length=100)),
                ("code", models.CharField(max_length=20)),
                ("is_paid", models.BooleanField(default=True)),
                ("requires_approval", models.BooleanField(default=True)),
                (
                    "max_consecutive_days",
                    models.PositiveIntegerField(
                        blank=True,
                        help_text="Maximum consecutive days allowed",
                        null=True,
                    ),
                ),
                ("color", models.CharField(default="#10b981", max_length=7)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="leave_leavetype_set",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Holiday",
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
                ("date", models.DateField()),
                (
                    "is_recurring",
                    models.BooleanField(
                        default=False,
                        help_text="Recurs every year on the same date",
                    ),
                ),
                (
                    "applies_to_all",
                    models.BooleanField(
                        default=True, help_text="Applies to all employees"
                    ),
                ),
                (
                    "departments",
                    models.ManyToManyField(
                        blank=True,
                        help_text="If not applies_to_all, only these departments",
                        related_name="holidays",
                        to="employees.department",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="leave_holiday_set",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["date"],
            },
        ),
        migrations.CreateModel(
            name="LeaveBalance",
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
                ("year", models.PositiveIntegerField()),
                ("entitled_days", models.DecimalField(decimal_places=2, max_digits=5)),
                (
                    "used_days",
                    models.DecimalField(decimal_places=2, default=0, max_digits=5),
                ),
                (
                    "carried_over",
                    models.DecimalField(decimal_places=2, default=0, max_digits=5),
                ),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="leave_balances",
                        to="employees.employee",
                    ),
                ),
                (
                    "leave_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="balances",
                        to="leave.leavetype",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="leave_leavebalance_set",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["-year", "leave_type__name"],
            },
        ),
        migrations.CreateModel(
            name="LeaveRequest",
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
                ("start_date", models.DateField()),
                ("end_date", models.DateField()),
                ("is_half_day", models.BooleanField(default=False)),
                (
                    "half_day_period",
                    models.CharField(
                        blank=True,
                        choices=[("morning", "Morning"), ("afternoon", "Afternoon")],
                        max_length=10,
                    ),
                ),
                ("reason", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("review_notes", models.TextField(blank=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="leave_requests",
                        to="employees.employee",
                    ),
                ),
                (
                    "leave_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="requests",
                        to="leave.leavetype",
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_leave_requests",
                        to="employees.employee",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="leave_leaverequest_set",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["-start_date"],
            },
        ),
        migrations.AddConstraint(
            model_name="leavetype",
            constraint=models.UniqueConstraint(
                fields=("tenant", "code"),
                name="unique_leave_type_code_per_tenant",
            ),
        ),
        migrations.AddConstraint(
            model_name="leavebalance",
            constraint=models.UniqueConstraint(
                fields=("tenant", "employee", "leave_type", "year"),
                name="unique_leave_balance_per_employee_type_year",
            ),
        ),
    ]
