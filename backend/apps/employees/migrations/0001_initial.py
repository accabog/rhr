# Generated manually for RHR project

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("tenants", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Department",
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
                ("code", models.CharField(blank=True, max_length=50)),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="children",
                        to="employees.department",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="employees_department_set",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Position",
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
                ("title", models.CharField(max_length=255)),
                ("code", models.CharField(blank=True, max_length=50)),
                ("description", models.TextField(blank=True)),
                (
                    "level",
                    models.PositiveSmallIntegerField(
                        default=1, help_text="Seniority level (1=entry, 5=senior, etc.)"
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                (
                    "department",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="positions",
                        to="employees.department",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="employees_position_set",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["title"],
            },
        ),
        migrations.CreateModel(
            name="Employee",
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
                ("employee_id", models.CharField(max_length=50)),
                ("first_name", models.CharField(max_length=150)),
                ("last_name", models.CharField(max_length=150)),
                ("email", models.EmailField(max_length=254)),
                ("phone", models.CharField(blank=True, max_length=50)),
                (
                    "avatar",
                    models.ImageField(
                        blank=True, null=True, upload_to="employee_avatars/"
                    ),
                ),
                ("hire_date", models.DateField()),
                ("termination_date", models.DateField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("on_leave", "On Leave"),
                            ("terminated", "Terminated"),
                            ("suspended", "Suspended"),
                        ],
                        default="active",
                        max_length=20,
                    ),
                ),
                ("date_of_birth", models.DateField(blank=True, null=True)),
                ("address", models.TextField(blank=True)),
                ("emergency_contact_name", models.CharField(blank=True, max_length=255)),
                ("emergency_contact_phone", models.CharField(blank=True, max_length=50)),
                (
                    "department",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="employees",
                        to="employees.department",
                    ),
                ),
                (
                    "manager",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="direct_reports",
                        to="employees.employee",
                    ),
                ),
                (
                    "position",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="employees",
                        to="employees.position",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="employees_employee_set",
                        to="tenants.tenant",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="employee_profiles",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["last_name", "first_name"],
            },
        ),
        migrations.AddField(
            model_name="department",
            name="manager",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="managed_departments",
                to="employees.employee",
            ),
        ),
        migrations.AddConstraint(
            model_name="department",
            constraint=models.UniqueConstraint(
                fields=("tenant", "code"),
                name="unique_department_code_per_tenant",
            ),
        ),
        migrations.AddConstraint(
            model_name="employee",
            constraint=models.UniqueConstraint(
                fields=("tenant", "employee_id"),
                name="unique_employee_id_per_tenant",
            ),
        ),
    ]
