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
            name="ContractType",
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
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="contracts_contracttype_set",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Contract",
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
                ("start_date", models.DateField()),
                ("end_date", models.DateField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("active", "Active"),
                            ("expired", "Expired"),
                            ("terminated", "Terminated"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                (
                    "salary",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=12, null=True
                    ),
                ),
                ("salary_currency", models.CharField(default="USD", max_length=3)),
                (
                    "salary_period",
                    models.CharField(
                        choices=[
                            ("hourly", "Hourly"),
                            ("daily", "Daily"),
                            ("weekly", "Weekly"),
                            ("monthly", "Monthly"),
                            ("yearly", "Yearly"),
                        ],
                        default="monthly",
                        max_length=20,
                    ),
                ),
                (
                    "hours_per_week",
                    models.DecimalField(decimal_places=1, default=40.0, max_digits=4),
                ),
                ("probation_end_date", models.DateField(blank=True, null=True)),
                ("probation_passed", models.BooleanField(default=False)),
                ("notice_period_days", models.PositiveIntegerField(default=30)),
                ("notes", models.TextField(blank=True)),
                (
                    "contract_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="contracts",
                        to="contracts.contracttype",
                    ),
                ),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="contracts",
                        to="employees.employee",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="contracts_contract_set",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["-start_date"],
            },
        ),
        migrations.CreateModel(
            name="ContractDocument",
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
                ("file", models.FileField(upload_to="contract_documents/")),
                (
                    "contract",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documents",
                        to="contracts.contract",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="contracts_contractdocument_set",
                        to="tenants.tenant",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="uploaded_documents",
                        to="employees.employee",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="contracttype",
            constraint=models.UniqueConstraint(
                fields=("tenant", "code"),
                name="unique_contract_type_code_per_tenant",
            ),
        ),
    ]
