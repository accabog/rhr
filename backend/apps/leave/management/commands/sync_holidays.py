"""
Management command to sync national holidays from Nager.Date API.

Usage:
    python manage.py sync_holidays                    # All tenants, current+next year
    python manage.py sync_holidays --tenant=acme      # Specific tenant by slug
    python manage.py sync_holidays --country=US       # Specific country only
    python manage.py sync_holidays --year=2025        # Specific year
    python manage.py sync_holidays --year=2025 --year=2026  # Multiple years
"""

from datetime import date

import requests
from django.core.management.base import BaseCommand, CommandError

from apps.leave.services import HolidaySyncService
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Sync national holidays from Nager.Date API"

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant",
            type=str,
            help="Tenant slug to sync holidays for. If not provided, syncs all tenants.",
        )
        parser.add_argument(
            "--country",
            type=str,
            help="ISO 3166-1 alpha-2 country code (e.g., US, DE). "
            "If not provided, syncs all countries from tenant departments.",
        )
        parser.add_argument(
            "--year",
            type=int,
            action="append",
            dest="years",
            help="Year(s) to sync. Can be specified multiple times. "
            "Defaults to current and next year.",
        )

    def handle(self, *args, **options):
        tenant_slug = options["tenant"]
        country_code = options["country"]
        years = options["years"]

        # Default years if not specified
        if not years:
            current_year = date.today().year
            years = [current_year, current_year + 1]

        # Get tenants to process
        if tenant_slug:
            try:
                tenants = [Tenant.objects.get(slug=tenant_slug, is_active=True)]
            except Tenant.DoesNotExist as e:
                raise CommandError(f"Tenant '{tenant_slug}' not found or inactive") from e
        else:
            tenants = Tenant.objects.filter(is_active=True)

        if not tenants:
            self.stdout.write(self.style.WARNING("No active tenants found"))
            return

        total_created = 0
        total_updated = 0

        for tenant in tenants:
            self.stdout.write(f"\nProcessing tenant: {tenant.name}")

            service = HolidaySyncService(tenant)

            if country_code:
                # Sync specific country
                countries = [country_code.upper()]
            else:
                # Get countries from departments
                countries = service.get_tenant_countries()
                if not countries:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  No countries configured in departments for {tenant.name}"
                        )
                    )
                    continue

            for country in countries:
                for year in years:
                    try:
                        result = service.sync_country(year, country)
                        created = result["created"]
                        updated = result["updated"]
                        total_created += created
                        total_updated += updated

                        self.stdout.write(
                            f"  {country}/{year}: {created} created, {updated} updated"
                        )

                    except requests.RequestException as e:
                        self.stdout.write(
                            self.style.ERROR(f"  {country}/{year}: Failed - {e}")
                        )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSync complete: {total_created} created, {total_updated} updated"
            )
        )
