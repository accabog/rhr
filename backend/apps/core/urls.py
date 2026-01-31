"""
Core API endpoints - health check, dashboard, documents, etc.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DashboardStatsView, DocumentViewSet, HealthCheckView

router = DefaultRouter()
router.register("documents", DocumentViewSet, basename="document")

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("", include(router.urls)),
]
