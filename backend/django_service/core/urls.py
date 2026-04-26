from django.urls import path

from .views import (
    AcceptAgreementView,
    ActiveAgreementView,
    CookieTokenRefreshView,
    CustomTokenView,
    ForgotPasswordView,
    GoogleAuthView,
    IntrospectTokenView,
    LogoutView,
    MeView,
    PresetDetailView,
    PresetsView,
    RegisterView,
    ResendVerificationView,
    ResetPasswordView,
    VerifyEmailView,
)

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="register"),
    path("auth/token", CustomTokenView.as_view(), name="token"),
    path("auth/token/refresh", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout", LogoutView.as_view(), name="logout"),
    path("auth/me", MeView.as_view(), name="me"),
    path("auth/introspect", IntrospectTokenView.as_view(), name="introspect"),
    path("auth/verify-email", VerifyEmailView.as_view(), name="verify_email"),
    path("auth/resend-verification", ResendVerificationView.as_view(), name="resend_verification"),
    path("auth/google", GoogleAuthView.as_view(), name="google_auth"),
    path("auth/password/forgot", ForgotPasswordView.as_view(), name="forgot_password"),
    path("auth/password/reset", ResetPasswordView.as_view(), name="reset_password"),
    path("agreements/active", ActiveAgreementView.as_view(), name="active_agreement"),
    path("agreements/accept", AcceptAgreementView.as_view(), name="accept_agreement"),
    path("presets", PresetsView.as_view(), name="presets"),
    path("presets/<int:preset_id>", PresetDetailView.as_view(), name="preset_detail"),
]
