from django.urls import path

from .views import (
    AcceptAgreementView,
    ActiveAgreementView,
    CustomTokenView,
    CustomTokenRefreshView,
    IntrospectTokenView,
    MeView,
    PresetDetailView,
    PresetsView,
    RegisterView,
)

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="register"),
    path("auth/token", CustomTokenView.as_view(), name="token"),
    path("auth/token/refresh", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me", MeView.as_view(), name="me"),
    path("auth/introspect", IntrospectTokenView.as_view(), name="introspect"),
    path("agreements/active", ActiveAgreementView.as_view(), name="active_agreement"),
    path("agreements/accept", AcceptAgreementView.as_view(), name="accept_agreement"),
    path("presets", PresetsView.as_view(), name="presets"),
    path("presets/<int:preset_id>", PresetDetailView.as_view(), name="preset_detail"),
]
