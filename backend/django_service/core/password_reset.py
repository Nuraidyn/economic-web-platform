"""
Password reset helpers.

Dev mode  (EMAIL_BACKEND=console.EmailBackend): prints email to stdout and
emits a logger.info line so the reset URL is easy to grep from test output.

Prod mode: EMAIL_BACKEND=smtp.EmailBackend — standard SMTP.
"""
import logging
import uuid as _uuid_module
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils import timezone

from .models import PasswordResetToken

logger = logging.getLogger(__name__)

_TTL_MINUTES = lambda: int(getattr(settings, "PASSWORD_RESET_TTL_MINUTES", 60))  # noqa: E731
_FRONTEND_URL = lambda: getattr(settings, "FRONTEND_URL", "http://localhost:5173")  # noqa: E731


def create_reset_token(user) -> PasswordResetToken:
    expires_at = timezone.now() + timedelta(minutes=_TTL_MINUTES())
    return PasswordResetToken.objects.create(user=user, expires_at=expires_at)


def send_reset_email(user, token: PasswordResetToken) -> None:
    reset_url = f"{_FRONTEND_URL()}/reset-password?token={token.token}"
    subject = "Reset your password — EVision"
    body = (
        f"Hi {user.username},\n\n"
        f"You requested a password reset. Click the link below:\n"
        f"{reset_url}\n\n"
        f"The link expires in {_TTL_MINUTES()} minutes.\n\n"
        f"If you did not request a password reset, please ignore this email."
    )

    is_console = "console" in getattr(settings, "EMAIL_BACKEND", "console")
    if is_console:
        logger.info("[DEV] Password reset link for '%s': %s", user.username, reset_url)

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("send_reset_email failed for %s: %s", user.email, exc, exc_info=True)


def reset_password(token_str: str, new_password: str) -> tuple[bool, object | None, str | None]:
    """
    Validate and consume a password reset token, then set the new password.
    Returns (ok, user_or_None, error_code_or_None).
    error_code: "invalid" | "expired" | "already_used" | "weak_password"
    """
    try:
        parsed = _uuid_module.UUID(str(token_str))
    except (ValueError, AttributeError):
        return False, None, "invalid"

    try:
        token = PasswordResetToken.objects.select_related("user__profile").get(token=parsed)
    except PasswordResetToken.DoesNotExist:
        return False, None, "invalid"

    if token.used_at is not None:
        return False, None, "already_used"

    if timezone.now() >= token.expires_at:
        return False, None, "expired"

    user = token.user

    try:
        validate_password(new_password, user=user)
    except DjangoValidationError:
        return False, None, "weak_password"

    user.set_password(new_password)
    user.save(update_fields=["password"])

    now = timezone.now()
    profile = getattr(user, "profile", None)
    if profile:
        profile.password_changed_at = now
        profile.save(update_fields=["password_changed_at"])

    token.consume()

    logger.info(
        "Password reset completed for user '%s' (id=%s) at %s",
        user.username,
        user.id,
        now.isoformat(),
    )

    return True, user, None
