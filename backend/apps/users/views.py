"""
User views for authentication and user management.
"""

from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.tenants.serializers import TenantMembershipSerializer

from .models import GoogleAccount
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    GoogleAccountSerializer,
    GoogleConnectSerializer,
    GoogleOAuthSerializer,
    UserRegistrationSerializer,
    UserSerializer,
)

User = get_user_model()


class LoginView(TokenObtainPairView):
    """
    JWT token obtain view with custom response including user data.

    POST /api/v1/auth/login/
    """

    serializer_class = CustomTokenObtainPairSerializer


class RefreshTokenView(TokenRefreshView):
    """
    JWT token refresh view.

    POST /api/v1/auth/refresh/
    """

    pass


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.

    POST /api/v1/auth/register/
    """

    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens for immediate login
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    """
    Logout endpoint that blacklists the refresh token.

    POST /api/v1/auth/logout/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {"detail": "Successfully logged out"},
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {"detail": "Invalid token"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(generics.RetrieveUpdateAPIView):
    """
    Get or update the current authenticated user.

    GET/PATCH /api/v1/users/me/
    """

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    Change password for the authenticated user.

    POST /api/v1/users/me/change-password/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()

        return Response(
            {"detail": "Password changed successfully"},
            status=status.HTTP_200_OK,
        )


class GoogleOAuthLoginView(APIView):
    """
    Google OAuth login for existing users.

    POST /api/v1/auth/google/

    Authenticates users via Google OAuth. First checks for a linked GoogleAccount
    by google_id, then falls back to matching by email.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleOAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        google_info = serializer.validated_google_info

        # Require verified email
        if not google_info.get("email_verified"):
            return Response(
                {"detail": "Google email is not verified"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = None

        # First, try to find user by linked GoogleAccount
        google_id = google_info.get("sub")
        if google_id:
            try:
                google_account = GoogleAccount.objects.select_related("user").get(
                    google_id=google_id
                )
                user = google_account.user
            except GoogleAccount.DoesNotExist:
                pass

        # Fall back to email matching if no linked account found
        if user is None:
            email = google_info["email"].lower()
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                return Response(
                    {
                        "detail": "No account found with this email address",
                        "code": "user_not_found",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Check if user is active
        if not user.is_active:
            return Response(
                {"detail": "This account is inactive"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        # Get user's tenants
        memberships = user.tenant_memberships.select_related("tenant").all()

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "tenants": TenantMembershipSerializer(memberships, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class GoogleConnectView(APIView):
    """
    Connect Google account to the authenticated user's profile.

    POST /api/v1/users/me/google/connect/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GoogleConnectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        google_info = serializer.validated_google_info

        # Check if user already has a Google account linked
        if hasattr(request.user, "google_account"):
            return Response(
                {"detail": "You already have a Google account connected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if this Google account is already linked to another user
        google_id = google_info["sub"]
        if GoogleAccount.objects.filter(google_id=google_id).exists():
            return Response(
                {"detail": "This Google account is already linked to another user"},
                status=status.HTTP_409_CONFLICT,
            )

        # Create the Google account linkage
        google_account = GoogleAccount.objects.create(
            user=request.user,
            google_id=google_id,
            google_email=google_info["email"],
            google_picture=google_info.get("picture", ""),
        )

        return Response(
            {
                "detail": "Google account connected successfully",
                "google_account": GoogleAccountSerializer(google_account).data,
            },
            status=status.HTTP_201_CREATED,
        )


class GoogleDisconnectView(APIView):
    """
    Disconnect Google account from the authenticated user's profile.

    POST /api/v1/users/me/google/disconnect/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            google_account = request.user.google_account
            google_account.delete()
            return Response(
                {"detail": "Google account disconnected successfully"},
                status=status.HTTP_200_OK,
            )
        except GoogleAccount.DoesNotExist:
            return Response(
                {"detail": "No Google account connected"},
                status=status.HTTP_400_BAD_REQUEST,
            )
