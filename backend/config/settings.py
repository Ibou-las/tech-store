import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() in {"1", "true", "yes"}
if not SECRET_KEY or SECRET_KEY.startswith("CHANGE-ME"):
    if not DEBUG:
        raise RuntimeError("DJANGO_SECRET_KEY doit être définie avec une valeur aléatoire en production.")
    SECRET_KEY = "dev-only-not-for-production-tech-store"

ALLOWED_HOSTS = [h.strip() for h in os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if h.strip()]
INSTALLED_APPS = [
    "django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes",
    "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles",
    "corsheaders", "rest_framework", "rest_framework_simplejwt.token_blacklist", "store",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [], "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request", "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]
WSGI_APPLICATION = "config.wsgi.application"

# Local development uses SQLite. Production should set DATABASE_URL or explicit PostgreSQL variables.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://"):
    import urllib.parse
    u = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": u.path.lstrip("/"), "USER": urllib.parse.unquote(u.username or ""),
        "PASSWORD": urllib.parse.unquote(u.password or ""), "HOST": u.hostname,
        "PORT": u.port or 5432,
        "OPTIONS": {"sslmode": "require"} if u.hostname not in {"localhost", "127.0.0.1", "db"} else {},
        "CONN_MAX_AGE": 60,
    }}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Dakar"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
MEDIA_BUCKET = os.getenv("AWS_STORAGE_BUCKET_NAME", "").strip()
MEDIA_ENDPOINT = os.getenv("AWS_S3_ENDPOINT_URL", "").strip()
MEDIA_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
MEDIA_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
MEDIA_PUBLIC_URL = os.getenv("SUPABASE_URL", "").strip()
if MEDIA_BUCKET and MEDIA_ENDPOINT and MEDIA_ACCESS_KEY and MEDIA_SECRET_KEY and MEDIA_PUBLIC_URL:
    DEFAULT_MEDIA_STORAGE = {
        "BACKEND": "config.storage.SupabasePublicStorage",
        "OPTIONS": {
            "bucket_name": MEDIA_BUCKET,
            "endpoint_url": MEDIA_ENDPOINT,
            "access_key": MEDIA_ACCESS_KEY,
            "secret_key": MEDIA_SECRET_KEY,
            "region_name": os.getenv("AWS_S3_REGION_NAME", "us-east-1"),
            "addressing_style": "path",
            "querystring_auth": False,
            "file_overwrite": False,
        },
    }
else:
    if not DEBUG and os.getenv("TECHSTORE_ALLOW_LOCAL_MEDIA_IN_PRODUCTION", "False").lower() not in {"1", "true", "yes"}:
        raise RuntimeError("En production, configure le stockage S3 distant des photos ou assume explicitement un disque persistant avec TECHSTORE_ALLOW_LOCAL_MEDIA_IN_PRODUCTION=True.")
    DEFAULT_MEDIA_STORAGE = {"BACKEND": "django.core.files.storage.FileSystemStorage"}
STORAGES = {
    "default": DEFAULT_MEDIA_STORAGE,
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticatedOrReadOnly"],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle", "rest_framework.throttling.UserRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"anon": "60/min", "user": "300/min", "order_create": "5/min", "login": "10/min"},
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
CORS_ALLOWED_ORIGINS = [x.strip() for x in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if x.strip()]
CSRF_TRUSTED_ORIGINS = [x.strip() for x in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if x.strip()]
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "False").lower() in {"1", "true", "yes"}
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
SECURE_HSTS_PRELOAD = False
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
