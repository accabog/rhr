"""
Timesheet URLs.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TimesheetViewSet

router = DefaultRouter()
router.register("", TimesheetViewSet, basename="timesheet")

urlpatterns = [
    path("", include(router.urls)),
]
