"""
URL configuration for RHR project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/users/", include("apps.users.urls_users")),
    path("api/v1/tenants/", include("apps.tenants.urls")),
    path("api/v1/employees/", include("apps.employees.urls")),
    path("api/v1/time-entries/", include("apps.timetracking.urls")),
    path("api/v1/timesheets/", include("apps.timesheets.urls")),
    path("api/v1/leave/", include("apps.leave.urls")),
    path("api/v1/contracts/", include("apps.contracts.urls")),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
