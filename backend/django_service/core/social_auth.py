"""
Google OAuth2 / OIDC social auth helpers.

Verification flow:
  1. Frontend obtains a Google ID token via the GIS "Sign In With Google" button.
  2. Frontend POSTs { credential: "<id_token>" } to /api/auth/google.
  3. Backend calls verify_google_token() — verifies signature + audience + expiry
     using Google's public JWKS endpoint (no client secret needed).
  4. find_or_create_google_user() links the verified identity to a Django user.
"""
import logging
import re

from django.conf import settings
from django.contrib.auth import get_user_model

from .models import SocialAccount, UserProfile

logger = logging.getLogger(__name__)
User = get_user_model()


def verify_google_token(credential: str) -> dict:
    """
    Verify a Google ID token and return the decoded payload.
    Raises ValueError when the token is invalid, expired, or the client_id
    is not configured.
    """
    # Import here so tests can patch at the module level
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise ValueError("GOOGLE_CLIENT_ID is not configured.")

    return id_token.verify_oauth2_token(
        credential,
        google_requests.Request(),
        client_id,
    )


def _generate_username(base: str) -> str:
    sanitized = re.sub(r"[^\w]", "_", base)[:30] or "user"
    username = sanitized
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{sanitized[:27]}_{counter}"
        counter += 1
    return username


def find_or_create_google_user(idinfo: dict):
    """
    Find or create a Django user from a verified Google ID token payload.

    Linking priority:
      1. Existing SocialAccount (same provider + provider_uid) → return its user.
      2. Existing user with matching email → link and return.
      3. No match → create new user with unusable password.
    """
    provider_uid = str(idinfo["sub"])
    email = idinfo.get("email", "")
    email_verified = idinfo.get("email_verified", False)

    # 1. Existing social account
    try:
        account = SocialAccount.objects.select_related("user__profile").get(
            provider="google", provider_uid=provider_uid
        )
        return account.user
    except SocialAccount.DoesNotExist:
        pass

    # 2. Email collision — link to existing user
    user = None
    if email:
        try:
            user = User.objects.select_related("profile").get(email=email)
        except User.DoesNotExist:
            pass

    # 3. Create new user
    if user is None:
        base = email.split("@")[0] if email else provider_uid
        username = _generate_username(base)
        user = User.objects.create_user(
            username=username,
            email=email,
            password=None,  # unusable password — only Google login allowed
        )
        logger.info("Created new user '%s' via Google OAuth (sub=%s)", user.username, provider_uid)

    # 4. Ensure profile + mark email verified if Google confirmed it
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if email_verified and not profile.is_email_verified:
        profile.is_email_verified = True
        profile.save(update_fields=["is_email_verified"])

    # 5. Create social account link (idempotent)
    SocialAccount.objects.get_or_create(
        provider="google",
        provider_uid=provider_uid,
        defaults={"user": user, "extra_data": idinfo},
    )

    return user
