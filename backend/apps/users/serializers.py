"""
User serializers for authentication and user management.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.tenants.models import Tenant, TenantMembership
from apps.tenants.serializers import TenantMembershipSerializer

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer that includes user info in response."""

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add extra user data to the response
        data["user"] = {
            "id": self.user.pk,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "full_name": self.user.full_name,
            "avatar": self.user.avatar.url if self.user.avatar else None,
            "is_active": self.user.is_active,
            "created_at": self.user.created_at.isoformat(),
            "updated_at": self.user.updated_at.isoformat(),
        }
        # Include user's tenants
        memberships = self.user.tenant_memberships.select_related("tenant").all()
        data["tenants"] = TenantMembershipSerializer(memberships, many=True).data
        return data


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    tenant_name = serializers.CharField(
        write_only=True,
        required=False,
        help_text="Create a new tenant with this name",
    )

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "tenant_name",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match"}
            )
        return attrs

    def create(self, validated_data):
        tenant_name = validated_data.pop("tenant_name", None)

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )

        # Create tenant if name provided
        if tenant_name:
            from django.utils.text import slugify

            slug = slugify(tenant_name)
            # Ensure unique slug
            base_slug = slug
            counter = 1
            while Tenant.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            tenant = Tenant.objects.create(name=tenant_name, slug=slug)
            TenantMembership.objects.create(
                user=user,
                tenant=tenant,
                role="owner",
                is_default=True,
            )

        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model (read/update)."""

    full_name = serializers.ReadOnlyField()
    tenants = TenantMembershipSerializer(
        source="tenant_memberships",
        many=True,
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "avatar",
            "is_active",
            "tenants",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "email", "is_active", "created_at", "updated_at"]


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""

    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect")
        return value


class UserInviteSerializer(serializers.Serializer):
    """Serializer for inviting users to a tenant."""

    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=TenantMembership.ROLE_CHOICES,
        default="employee",
    )
