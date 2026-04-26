"""
Email verification helpers.

Dev mode  (EMAIL_BACKEND=console.EmailBackend): Django prints the email to
stdout automatically; we also emit a logger.info line so the URL is easy to
grep from test output.

Prod mode: EMAIL_BACKEND=smtp.EmailBackend — standard SMTP.
"""
import logging
import uuid as _uuid_module
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import EmailVerificationToken

logger = logging.getLogger(__name__)

_TTL_HOURS = lambda: int(getattr(settings, "EMAIL_VERIFICATION_TTL_HOURS", 24))  # noqa: E731
_FRONTEND_URL = lambda: getattr(settings, "FRONTEND_URL", "http://localhost:5173")  # noqa: E731


def create_verification_token(user) -> EmailVerificationToken:
    expires_at = timezone.now() + timedelta(hours=_TTL_HOURS())
    return EmailVerificationToken.objects.create(user=user, expires_at=expires_at)


def send_verification_email(user, token: EmailVerificationToken) -> None:
    verify_url = f"{_FRONTEND_URL()}/verify-email?token={token.token}"
    subject = "Verify your email — EVision"
    body = (
        f"Hi {user.username},\n\n"
        f"Click the link below to verify your email address:\n"
        f"{verify_url}\n\n"
        f"The link expires in {_TTL_HOURS()} hours.\n\n"
        f"If you did not register on EVision, please ignore this email."
    )

    is_console = "console" in getattr(settings, "EMAIL_BACKEND", "console")
    if is_console:
        logger.info("[DEV] Verification link for '%s': %s", user.username, verify_url)

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("send_verification_email failed for %s: %s", user.email, exc, exc_info=True)


def verify_token(token_str: str) -> tuple[bool, object | None, str | None]:
    """
    Validate and consume a verification token.
    Returns (ok, user_or_None, error_code_or_None).
    error_code: "invalid" | "expired" | "already_used"
    """
    try:
        parsed = _uuid_module.UUID(str(token_str))
    except (ValueError, AttributeError):
        return False, None, "invalid"

    try:
        token = EmailVerificationToken.objects.select_related("user__profile").get(
            token=parsed
        )
    except EmailVerificationToken.DoesNotExist:
        return False, None, "invalid"

    if token.used_at is not None:
        return False, None, "already_used"

    if timezone.now() >= token.expires_at:
        return False, None, "expired"

    token.consume()

    profile = getattr(token.user, "profile", None)
    if profile:
        profile.is_email_verified = True
        profile.save(update_fields=["is_email_verified"])

    return True, token.user, None
