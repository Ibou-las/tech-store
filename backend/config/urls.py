from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.permissions import AllowAny
from store.throttles import LoginRateThrottle
from store.views import HealthView
from store.user_views import StaffUsersView
from store.auth_views import CurrentUserView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthView.as_view(), name="health"),
    path("api/auth/token/", TokenObtainPairView.as_view(permission_classes=[AllowAny], throttle_classes=[LoginRateThrottle]), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(permission_classes=[AllowAny]), name="token_refresh"),
    path("api/users/", StaffUsersView.as_view(), name="staff_users"),
    path("api/auth/me/", CurrentUserView.as_view(), name="current_user"),
    path("api/", include("store.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
