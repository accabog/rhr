"""
Tests for user authentication views.
"""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestLoginView:
    """Tests for login endpoint."""

    def test_login_with_valid_credentials(self, api_client, user):
        """Test login with valid email and password."""
        url = reverse("auth-login")
        data = {
            "email": "test@example.com",
            "password": "testpass123",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data
        assert response.data["user"]["email"] == "test@example.com"

    def test_login_returns_user_tenants(self, api_client, user, tenant, tenant_membership):
        """Test login includes user's tenants."""
        url = reverse("auth-login")
        data = {
            "email": "test@example.com",
            "password": "testpass123",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "tenants" in response.data
        assert len(response.data["tenants"]) >= 1

    def test_login_with_invalid_password(self, api_client, user):
        """Test login with wrong password fails."""
        url = reverse("auth-login")
        data = {
            "email": "test@example.com",
            "password": "wrongpassword",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_with_invalid_email(self, api_client):
        """Test login with non-existent email fails."""
        url = reverse("auth-login")
        data = {
            "email": "nonexistent@example.com",
            "password": "testpass123",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_with_missing_fields(self, api_client):
        """Test login with missing fields fails."""
        url = reverse("auth-login")
        data = {"email": "test@example.com"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestRegisterView:
    """Tests for registration endpoint."""

    def test_register_creates_user(self, api_client):
        """Test successful user registration."""
        url = reverse("auth-register")
        data = {
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "New",
            "last_name": "User",
            "tenant_name": "New Company",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert "user" in response.data
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["user"]["email"] == "newuser@example.com"

    def test_register_returns_tokens(self, api_client):
        """Test registration returns JWT tokens for immediate login."""
        url = reverse("auth-register")
        data = {
            "email": "tokenuser@example.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "Token",
            "last_name": "User",
            "tenant_name": "Token Company",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert "access" in response.data
        assert "refresh" in response.data
        # Verify tokens are non-empty strings
        assert len(response.data["access"]) > 0
        assert len(response.data["refresh"]) > 0

    def test_register_with_duplicate_email(self, api_client, user):
        """Test registration with existing email fails."""
        url = reverse("auth-register")
        data = {
            "email": "test@example.com",  # Already exists
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "Duplicate",
            "last_name": "User",
            "tenant_name": "Dup Company",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_with_weak_password(self, api_client):
        """Test registration with weak password fails."""
        url = reverse("auth-register")
        data = {
            "email": "weakpass@example.com",
            "password": "123",  # Too short/weak
            "password_confirm": "123",
            "first_name": "Weak",
            "last_name": "Password",
            "tenant_name": "Weak Company",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_with_missing_fields(self, api_client):
        """Test registration with missing required fields fails."""
        url = reverse("auth-register")
        data = {
            "email": "incomplete@example.com",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_with_invalid_email(self, api_client):
        """Test registration with invalid email format fails."""
        url = reverse("auth-register")
        data = {
            "email": "not-an-email",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "Invalid",
            "last_name": "Email",
            "tenant_name": "Invalid Company",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestLogoutView:
    """Tests for logout endpoint."""

    def test_logout_requires_auth(self, api_client):
        """Test logout requires authentication."""
        url = reverse("auth-logout")
        response = api_client.post(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_with_valid_token(self, authenticated_client, user):
        """Test logout with valid refresh token."""
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(user)

        url = reverse("auth-logout")
        data = {"refresh": str(refresh)}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Successfully logged out"

    def test_logout_without_refresh_token(self, authenticated_client):
        """Test logout without refresh token still succeeds."""
        url = reverse("auth-logout")
        response = authenticated_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK

    def test_logout_with_invalid_token(self, authenticated_client):
        """Test logout with invalid refresh token."""
        url = reverse("auth-logout")
        data = {"refresh": "invalid-token-string"}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid token" in response.data["detail"]


@pytest.mark.django_db
class TestMeView:
    """Tests for current user endpoint."""

    def test_me_requires_auth(self, api_client):
        """Test /me endpoint requires authentication."""
        url = reverse("user-me")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_returns_current_user(self, authenticated_client, user):
        """Test /me endpoint returns current user data."""
        url = reverse("user-me")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email
        assert response.data["first_name"] == user.first_name
        assert response.data["last_name"] == user.last_name

    def test_me_update_user(self, authenticated_client, user):
        """Test updating user via /me endpoint."""
        url = reverse("user-me")
        data = {
            "first_name": "Updated",
            "last_name": "Name",
        }

        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == "Updated"
        assert response.data["last_name"] == "Name"

        # Verify in database
        user.refresh_from_db()
        assert user.first_name == "Updated"

    def test_me_cannot_change_email(self, authenticated_client, user):
        """Test email cannot be changed via /me endpoint."""
        url = reverse("user-me")
        original_email = user.email
        data = {
            "email": "newemail@example.com",
        }

        response = authenticated_client.patch(url, data)

        # Request may succeed but email should not change
        user.refresh_from_db()
        assert user.email == original_email


@pytest.mark.django_db
class TestChangePasswordView:
    """Tests for password change endpoint."""

    def test_change_password_requires_auth(self, api_client):
        """Test password change requires authentication."""
        url = reverse("user-change-password")
        data = {
            "old_password": "testpass123",
            "new_password": "NewPass123!",
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_change_password_success(self, authenticated_client, user):
        """Test successful password change."""
        url = reverse("user-change-password")
        data = {
            "old_password": "testpass123",
            "new_password": "NewSecurePass123!",
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "Password changed successfully" in response.data["detail"]

        # Verify new password works
        user.refresh_from_db()
        assert user.check_password("NewSecurePass123!")

    def test_change_password_wrong_current(self, authenticated_client, user):
        """Test password change with wrong current password."""
        url = reverse("user-change-password")
        data = {
            "old_password": "wrongpassword",
            "new_password": "NewSecurePass123!",
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password_weak_new_password(self, authenticated_client, user):
        """Test password change with weak new password."""
        url = reverse("user-change-password")
        data = {
            "old_password": "testpass123",
            "new_password": "123",  # Too weak
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password_missing_fields(self, authenticated_client, user):
        """Test password change with missing fields."""
        url = reverse("user-change-password")
        data = {
            "old_password": "testpass123",
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestRefreshTokenView:
    """Tests for token refresh endpoint."""

    def test_refresh_with_valid_token(self, api_client, user):
        """Test token refresh with valid refresh token."""
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(user)

        url = reverse("auth-refresh")
        data = {"refresh": str(refresh)}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_refresh_with_invalid_token(self, api_client):
        """Test token refresh with invalid token fails."""
        url = reverse("auth-refresh")
        data = {"refresh": "invalid-token"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_with_missing_token(self, api_client):
        """Test token refresh without token fails."""
        url = reverse("auth-refresh")

        response = api_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
