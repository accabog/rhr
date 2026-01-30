"""
Tests for users app.
"""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )
        assert user.email == "test@example.com"
        assert user.check_password("testpass123")
        assert not user.is_staff
        assert not user.is_superuser

    def test_create_superuser(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="adminpass123",
        )
        assert user.is_staff
        assert user.is_superuser

    def test_user_full_name(self):
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="John",
            last_name="Doe",
        )
        assert user.full_name == "John Doe"

    def test_user_full_name_fallback_to_email(self):
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )
        assert user.full_name == "test@example.com"


@pytest.mark.django_db
class TestAuthEndpoints:
    def test_login_success(self, api_client, user):
        url = reverse("auth-login")
        response = api_client.post(
            url,
            {"email": "test@example.com", "password": "testpass123"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data

    def test_login_invalid_credentials(self, api_client, user):
        url = reverse("auth-login")
        response = api_client.post(
            url,
            {"email": "test@example.com", "password": "wrongpassword"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_register_success(self, api_client):
        url = reverse("auth-register")
        response = api_client.post(
            url,
            {
                "email": "newuser@example.com",
                "password": "newpass123!",
                "password_confirm": "newpass123!",
                "tenant_name": "My Company",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert "access" in response.data
        assert "refresh" in response.data
        assert User.objects.filter(email="newuser@example.com").exists()

    def test_register_password_mismatch(self, api_client):
        url = reverse("auth-register")
        response = api_client.post(
            url,
            {
                "email": "newuser@example.com",
                "password": "newpass123!",
                "password_confirm": "differentpass",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_me_endpoint_authenticated(self, authenticated_client, user):
        url = reverse("user-me")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email

    def test_me_endpoint_unauthenticated(self, api_client):
        url = reverse("user-me")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
