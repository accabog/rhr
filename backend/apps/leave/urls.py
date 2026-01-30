"""
Leave management URLs.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    HolidayViewSet,
    LeaveBalanceViewSet,
    LeaveRequestViewSet,
    LeaveTypeViewSet,
)

router = DefaultRouter()
router.register("types", LeaveTypeViewSet, basename="leavetype")
router.register("balances", LeaveBalanceViewSet, basename="leavebalance")
router.register("requests", LeaveRequestViewSet, basename="leaverequest")
router.register("holidays", HolidayViewSet, basename="holiday")

urlpatterns = [
    path("", include(router.urls)),
]
