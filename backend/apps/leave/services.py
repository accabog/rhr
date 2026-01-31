"""
Holiday sync services for fetching national holidays from external APIs.
"""

import logging
from datetime import date
from typing import Any

import requests
from django.db import transaction

from apps.employees.models import Department
from apps.tenants.models import Tenant

from .models import Holiday

logger = logging.getLogger(__name__)

NAGER_DATE_API_BASE = "https://date.nager.at/api/v3"


class HolidaySyncService:
    """Service for syncing national holidays from Nager.Date API."""

    def __init__(self, tenant: Tenant):
        self.tenant = tenant

    def get_tenant_countries(self) -> set[str]:
        """Get unique country codes from active departments."""
        countries = (
            Department.objects.filter(tenant=self.tenant, is_active=True)
            .exclude(country="")
            .values_list("country", flat=True)
            .distinct()
        )
        return set(countries)

    def fetch_holidays(self, year: int, country_code: str) -> list[dict[str, Any]]:
        """
        Fetch public holidays from Nager.Date API.

        Args:
            year: The year to fetch holidays for
            country_code: ISO 3166-1 alpha-2 country code (e.g., 'US', 'DE')

        Returns:
            List of holiday dictionaries from the API

        Raises:
            requests.RequestException: If the API request fails
        """
        url = f"{NAGER_DATE_API_BASE}/PublicHolidays/{year}/{country_code}"

        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to fetch holidays for {country_code}/{year}: {e}")
            raise

    @transaction.atomic
    def sync_country(self, year: int, country_code: str) -> dict[str, int]:
        """
        Sync holidays for a specific country and year.

        Args:
            year: The year to sync
            country_code: ISO 3166-1 alpha-2 country code

        Returns:
            Dictionary with 'created' and 'updated' counts
        """
        holidays_data = self.fetch_holidays(year, country_code)

        created_count = 0
        updated_count = 0

        for holiday_data in holidays_data:
            holiday_date = date.fromisoformat(holiday_data["date"])

            # Build external ID from API data
            external_id = f"{country_code}-{holiday_date.isoformat()}-{holiday_data['name']}"

            holiday, created = Holiday.objects.update_or_create(
                tenant=self.tenant,
                country=country_code,
                date=holiday_date,
                name=holiday_data["name"],
                defaults={
                    "source": "nager_date",
                    "external_id": external_id,
                    "local_name": holiday_data.get("localName", ""),
                    "holiday_types": holiday_data.get("types", []),
                    "is_recurring": False,
                    "applies_to_all": True,
                },
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        logger.info(
            f"Synced holidays for {country_code}/{year}: "
            f"{created_count} created, {updated_count} updated"
        )

        return {"created": created_count, "updated": updated_count}

    def sync_all_countries(
        self, years: list[int] | None = None
    ) -> dict[str, dict[str, int]]:
        """
        Sync holidays for all countries in tenant's departments.

        Args:
            years: List of years to sync. Defaults to current and next year.

        Returns:
            Dictionary mapping country codes to their sync results
        """
        if years is None:
            current_year = date.today().year
            years = [current_year, current_year + 1]

        countries = self.get_tenant_countries()
        results = {}

        for country_code in countries:
            country_results = {"created": 0, "updated": 0}

            for year in years:
                try:
                    year_results = self.sync_country(year, country_code)
                    country_results["created"] += year_results["created"]
                    country_results["updated"] += year_results["updated"]
                except requests.RequestException:
                    logger.warning(
                        f"Skipping {country_code}/{year} due to API error"
                    )
                    continue

            results[country_code] = country_results

        return results


def get_available_countries() -> list[dict[str, str]]:
    """
    Fetch list of available countries from Nager.Date API.

    Returns:
        List of country dictionaries with 'countryCode' and 'name' keys
    """
    url = f"{NAGER_DATE_API_BASE}/AvailableCountries"

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch available countries: {e}")
        raise
