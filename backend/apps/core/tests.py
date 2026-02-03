"""
Tests for core app.
"""

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestHealthCheck:
    def test_health_check_returns_200(self, api_client):
        url = reverse("health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "healthy"
        assert response.data["service"] == "rhr-backend"
