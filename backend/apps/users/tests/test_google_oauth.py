"""
Tests for Google OAuth login and Google account linking.
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

from apps.users.models import GoogleAccount

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
            assert "Invalid or expired Google token" in str(response.data)

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

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_via_linked_account(self, api_client, user, tenant, tenant_membership, google_user_info):
        """Test Google OAuth login via linked GoogleAccount (not email match)."""
        # Create a linked Google account for the user
        GoogleAccount.objects.create(
            user=user,
            google_id=google_user_info["sub"],
            google_email="different@gmail.com",  # Different from user email
        )

        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("auth-google")
            data = {"credential": "valid-google-id-token"}

            response = api_client.post(url, data)

            assert response.status_code == status.HTTP_200_OK
            assert response.data["user"]["email"] == user.email

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_google_login_linked_account_takes_priority_over_email(
        self, api_client, tenant, tenant_membership
    ):
        """Test that linked GoogleAccount takes priority over email matching."""
        # Create a user with the Google email (this would match by email)
        email_matching_user = User.objects.create_user(
            email="google@gmail.com",
            password="testpass123",
        )

        # Create another user who has this Google account linked
        linked_user = User.objects.create_user(
            email="linked@example.com",
            password="testpass123",
        )

        google_user_info = {
            "email": "google@gmail.com",  # Matches email_matching_user
            "email_verified": True,
            "name": "Test User",
            "given_name": "Test",
            "family_name": "User",
            "picture": "https://lh3.googleusercontent.com/a/example",
            "iss": "accounts.google.com",
            "sub": "linked-account-sub-123",
        }

        # Link the Google account to linked_user (not email_matching_user)
        GoogleAccount.objects.create(
            user=linked_user,
            google_id=google_user_info["sub"],
            google_email=google_user_info["email"],
        )

        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("auth-google")
            data = {"credential": "valid-google-id-token"}

            response = api_client.post(url, data)

            # Should log in linked_user (via GoogleAccount), not email_matching_user
            assert response.status_code == status.HTTP_200_OK
            assert response.data["user"]["id"] == linked_user.id
            assert response.data["user"]["email"] == "linked@example.com"


@pytest.mark.django_db
class TestGoogleConnectView:
    """Tests for Google account connection endpoint."""

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_connect_google_success(self, authenticated_client, user, google_user_info):
        """Test successfully connecting a Google account."""
        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("google-connect")
            data = {"credential": "valid-google-id-token"}

            response = authenticated_client.post(url, data)

            assert response.status_code == status.HTTP_201_CREATED
            assert "google_account" in response.data
            assert response.data["google_account"]["google_email"] == google_user_info["email"]

            # Verify the GoogleAccount was created
            assert GoogleAccount.objects.filter(user=user).exists()
            google_account = GoogleAccount.objects.get(user=user)
            assert google_account.google_id == google_user_info["sub"]

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_connect_google_stores_picture(self, authenticated_client, user, google_user_info):
        """Test that Google picture URL is stored."""
        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("google-connect")
            data = {"credential": "valid-google-id-token"}

            response = authenticated_client.post(url, data)

            assert response.status_code == status.HTTP_201_CREATED
            google_account = GoogleAccount.objects.get(user=user)
            assert google_account.google_picture == google_user_info["picture"]

    def test_connect_google_requires_auth(self, api_client):
        """Test that connecting Google account requires authentication."""
        url = reverse("google-connect")
        data = {"credential": "valid-google-id-token"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_connect_google_already_connected(self, authenticated_client, user, google_user_info):
        """Test connecting Google when user already has one connected."""
        # Create an existing Google account
        GoogleAccount.objects.create(
            user=user,
            google_id="existing-google-id",
            google_email="existing@gmail.com",
        )

        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("google-connect")
            data = {"credential": "valid-google-id-token"}

            response = authenticated_client.post(url, data)

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "already have a Google account connected" in response.data["detail"]

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_connect_google_already_linked_to_other_user(self, authenticated_client, user, google_user_info):
        """Test connecting a Google account that's linked to another user."""
        # Create another user with this Google account linked
        other_user = User.objects.create_user(
            email="other@example.com",
            password="testpass123",
        )
        GoogleAccount.objects.create(
            user=other_user,
            google_id=google_user_info["sub"],
            google_email=google_user_info["email"],
        )

        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = google_user_info

            url = reverse("google-connect")
            data = {"credential": "valid-google-id-token"}

            response = authenticated_client.post(url, data)

            assert response.status_code == status.HTTP_409_CONFLICT
            assert "already linked to another user" in response.data["detail"]

    @override_settings(GOOGLE_OAUTH2_CLIENT_ID=GOOGLE_CLIENT_ID_SETTING)
    def test_connect_google_invalid_token(self, authenticated_client):
        """Test connecting with an invalid Google token."""
        with patch("apps.users.serializers.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.side_effect = ValueError("Invalid token")

            url = reverse("google-connect")
            data = {"credential": "invalid-token"}

            response = authenticated_client.post(url, data)

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Invalid or expired Google token" in str(response.data)


@pytest.mark.django_db
class TestGoogleDisconnectView:
    """Tests for Google account disconnection endpoint."""

    def test_disconnect_google_success(self, authenticated_client, user):
        """Test successfully disconnecting a Google account."""
        # Create a linked Google account
        GoogleAccount.objects.create(
            user=user,
            google_id="test-google-id",
            google_email="test@gmail.com",
        )

        url = reverse("google-disconnect")

        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert "disconnected successfully" in response.data["detail"]
        assert not GoogleAccount.objects.filter(user=user).exists()

    def test_disconnect_google_requires_auth(self, api_client):
        """Test that disconnecting Google account requires authentication."""
        url = reverse("google-disconnect")

        response = api_client.post(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_disconnect_google_not_connected(self, authenticated_client, user):
        """Test disconnecting when no Google account is connected."""
        url = reverse("google-disconnect")

        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "No Google account connected" in response.data["detail"]


@pytest.mark.django_db
class TestUserSerializerGoogleAccount:
    """Tests for GoogleAccount in UserSerializer."""

    def test_me_includes_google_account(self, authenticated_client, user):
        """Test that /users/me/ includes google_account field."""
        GoogleAccount.objects.create(
            user=user,
            google_id="test-google-id",
            google_email="test@gmail.com",
            google_picture="https://example.com/photo.jpg",
        )

        url = reverse("user-me")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "google_account" in response.data
        assert response.data["google_account"]["google_email"] == "test@gmail.com"
        assert response.data["google_account"]["google_picture"] == "https://example.com/photo.jpg"

    def test_me_google_account_null_when_not_connected(self, authenticated_client, user):
        """Test that google_account is null when not connected."""
        url = reverse("user-me")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["google_account"] is None
