"""
User management URL configuration.
"""

from django.urls import path

from .views import ChangePasswordView, GoogleConnectView, GoogleDisconnectView, MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="user-me"),
    path("me/change-password/", ChangePasswordView.as_view(), name="user-change-password"),
    path("me/google/connect/", GoogleConnectView.as_view(), name="google-connect"),
    path("me/google/disconnect/", GoogleDisconnectView.as_view(), name="google-disconnect"),
]
