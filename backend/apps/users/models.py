"""
Custom User model with email-based authentication.
"""

from __future__ import annotations

from typing import Any, ClassVar

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from apps.core.models import TimestampedModel


class UserManager(BaseUserManager["User"]):
    """Manager for custom User model."""

    def create_user(
        self, email: str, password: str | None = None, **extra_fields: Any
    ) -> User:
        """Create and return a regular user."""
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self, email: str, password: str | None = None, **extra_fields: Any
    ) -> User:
        """Create and return a superuser."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimestampedModel):
    """
    Custom User model using email instead of username.
    Users can belong to multiple tenants via TenantMembership.
    """

    email = models.EmailField(unique=True, max_length=255)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)

    # Relationship to tenants (through TenantMembership)
    tenants = models.ManyToManyField(
        "tenants.Tenant",
        through="tenants.TenantMembership",
        related_name="users",
    )

    objects: UserManager = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: ClassVar[list[str]] = []

    class Meta:
        ordering = ["email"]

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}".strip() or self.email


class GoogleAccount(TimestampedModel):
    """
    Links a User to their Google account for OAuth login.

    When a user connects their Google account from profile settings,
    this record is created. The google_id is used to match users
    during Google OAuth login flow.
    """

    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="google_account",
    )
    google_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="Google's unique user identifier (sub claim)",
    )
    google_email = models.EmailField(
        help_text="Email from Google account (may differ from user email)",
    )
    google_picture = models.URLField(
        blank=True,
        help_text="Profile picture URL from Google",
    )

    class Meta:
        verbose_name = "Google Account"
        verbose_name_plural = "Google Accounts"

    def __str__(self) -> str:
        return f"{self.user.email} -> {self.google_email}"
