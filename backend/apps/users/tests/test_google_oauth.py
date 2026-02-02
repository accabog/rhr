"""
Tests for Google OAuth login.
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

User = get_user_model()


@pytest.fixture
def google_user_info():
    """Return mock Google user info from verified token."""
    return {
        "email": "test@example.com",
        "email_verified": True,
        "name": "Test User",
        "given_name": "Test",
        "family_name": "User",
        "picture": "https://lh3.googleusercontent.com/a/example",
        "iss": "accounts.google.com",
        "sub": "123456789",
    }


@pytest.fixture
def inactive_user(db):
    """Create an inactive user."""
    return User.objects.create_user(
        email="inactive@example.com",
        password="testpass123",
        first_name="Inactive",
        last_name="User",
        is_active=False,
    )


GOOGLE_CLIENT_ID_SETTING = "test-client-id.apps.googleusercontent.com"


@pytest.mark.django_db
class TestGoogleOAuthLoginView:
    """Tests for Google OAuth login endpoint."""

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_success(self, api_client, user, tenant, tenant_membership, google_user_info):
        """Test successful Google OAuth login for existing user."""
        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("auth-google")
            data = {"credential": "valid-google-id-token"}

            response = api_client.post(url, data)

            assert response.status_code == status.HTTP_200_OK
            assert "access" in response.data
            assert "refresh" in response.data
            assert "user" in response.data
            assert "tenants" in response.data
            assert response.data["user"]["email"] == "test@example.com"

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_returns_jwt_tokens(self, api_client, user, tenant, tenant_membership, google_user_info):
        """Test Google OAuth login returns valid JWT tokens."""
        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("auth-google")
            data = {"credential": "valid-google-id-token"}

            response = api_client.post(url, data)

            assert response.status_code == status.HTTP_200_OK
            assert len(response.data["access"]) > 0
            assert len(response.data["refresh"]) > 0

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_user_not_found(self, api_client, google_user_info):
        """Test Google OAuth login with non-existent user returns 404."""
        google_user_info["email"] = "nonexistent@example.com"

        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("auth-google")
            data = {"credential": "valid-google-id-token"}

            response = api_client.post(url, data)

            assert response.status_code == status.HTTP_404_NOT_FOUND
            assert response.data["code"] == "user_not_found"
            assert "No account found" in response.data["detail"]

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_unverified_email(self, api_client, user, google_user_info):
        """Test Google OAuth login fails when Google email is not verified."""
        google_user_info["email_verified"] = False

        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("auth-google")
            data = {"credential": "valid-google-id-token"}

            response = api_client.post(url, data)

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "not verified" in response.data["detail"]

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_inactive_user(self, api_client, inactive_user, google_user_info):
        """Test Google OAuth login fails for inactive user."""
        google_user_info["email"] = "inactive@example.com"

        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("auth-google")
            data = {"credential": "valid-google-id-token"}

            response = api_client.post(url, data)

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "inactive" in response.data["detail"]

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_invalid_token(self, api_client):
        """Test Google OAuth login with invalid token."""
        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.side_effect = ValueError("Invalid token")

            url = reverse("auth-google")
            data = {"credential": "invalid-token"}

            response = api_client.post(url, data)

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Invalid Google token" in str(response.data)

    def test_google_login_missing_credential(self, api_client):
        """Test Google OAuth login without credential."""
        url = reverse("auth-google")
        data = {}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_invalid_issuer(self, api_client, user, google_user_info):
        """Test Google OAuth login with invalid token issuer."""
        google_user_info["iss"] = "malicious-issuer.com"

        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("auth-google")
            data = {"credential": "valid-google-id-token"}

            response = api_client.post(url, data)

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Invalid token issuer" in str(response.data)

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_case_insensitive_email(self, api_client, user, tenant, tenant_membership, google_user_info):
        """Test Google OAuth login matches email case-insensitively."""
        google_user_info["email"] = "TEST@EXAMPLE.COM"

        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("auth-google")
            data = {"credential": "valid-google-id-token"}

            response = api_client.post(url, data)

            assert response.status_code == status.HTTP_200_OK
            assert response.data["user"]["email"] == "test@example.com"

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_returns_user_tenants(self, api_client, user, tenant, tenant_membership, google_user_info):
        """Test Google OAuth login returns user's tenant memberships."""
        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("auth-google")
            data = {"credential": "valid-google-id-token"}

            response = api_client.post(url, data)

            assert response.status_code == status.HTTP_200_OK
            assert "tenants" in response.data
            assert len(response.data["tenants"]) >= 1
            assert response.data["tenants"][0]["tenant"]["name"] == "Test Company"

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID="")
    def test_google_login_not_configured(self, api_client):
        """Test Google OAuth login when not configured."""
        url = reverse("auth-google")
        data = {"credential": "valid-google-id-token"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not configured" in str(response.data)
