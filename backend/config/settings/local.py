"""
Django local development settings.
"""

import dj_database_url

from .base import *  # noqa: F403

DEBUG = True

# Include .example.com for subdomain tests
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", ".example.com"]

# Database
DATABASES = {
    "default": dj_database_url.config(
        default="postgres://rhr:rhr_dev_password@localhost:5432/rhr",
        conn_max_age=600,
    )
}

# CORS - Allow all in development
CORS_ALLOW_ALL_ORIGINS = True

# Email - Console backend for development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Debug toolbar (optional, if installed)
try:
    import debug_toolbar  # noqa: F401

    INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
    MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405
    INTERNAL_IPS = ["127.0.0.1"]
except ImportError:
    pass
