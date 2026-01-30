# Generated manually for RHR project

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
        ("tenants", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="tenants",
            field=models.ManyToManyField(
                related_name="users",
                through="tenants.TenantMembership",
                to="tenants.tenant",
            ),
        ),
    ]
