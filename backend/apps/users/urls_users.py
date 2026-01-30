"""
User management URL configuration.
"""

from django.urls import path

from .views import ChangePasswordView, MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="user-me"),
    path("me/change-password/", ChangePasswordView.as_view(), name="user-change-password"),
]
