"""
Django test settings.
Uses SQLite for tests to avoid requiring PostgreSQL.
"""

from .base import *  # noqa: F403

DEBUG = False

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver", ".example.com"]

# Use SQLite for tests
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Faster password hashing for tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Disable logging during tests
LOGGING = {}

# Email - In-memory backend for tests
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Disable caching for tests
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Secret key for tests
SECRET_KEY = "test-secret-key-not-for-production"
