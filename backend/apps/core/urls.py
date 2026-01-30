"""
Core API endpoints - health check, dashboard, etc.
"""

from django.urls import path

from .views import DashboardStatsView, HealthCheckView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
]
