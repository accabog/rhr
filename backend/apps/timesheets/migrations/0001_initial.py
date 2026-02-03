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
            name="Timesheet",
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
                ("period_start", models.DateField()),
                ("period_end", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("submitted", "Submitted"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                (
                    "total_regular_hours",
                    models.DecimalField(decimal_places=2, default=0, max_digits=6),
                ),
                (
                    "total_overtime_hours",
                    models.DecimalField(decimal_places=2, default=0, max_digits=6),
                ),
                (
                    "total_break_hours",
                    models.DecimalField(decimal_places=2, default=0, max_digits=6),
                ),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("rejection_reason", models.TextField(blank=True)),
                (
                    "approved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="approved_timesheets",
                        to="employees.employee",
                    ),
                ),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="timesheets",
                        to="employees.employee",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="timesheets_timesheet_set",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["-period_start"],
            },
        ),
        migrations.CreateModel(
            name="TimesheetComment",
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
                ("content", models.TextField()),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="timesheet_comments",
                        to="employees.employee",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="timesheets_timesheetcomment_set",
                        to="tenants.tenant",
                    ),
                ),
                (
                    "timesheet",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="timesheets.timesheet",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="timesheet",
            constraint=models.UniqueConstraint(
                fields=("tenant", "employee", "period_start"),
                name="unique_timesheet_per_employee_period",
            ),
        ),
    ]
