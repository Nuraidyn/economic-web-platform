"""
Tests for email verification flow.

All email sending is intercepted via django.test.utils.override_settings
and django.core.mail.outbox so no real SMTP is needed.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone

from core.email_verification import create_verification_token, verify_token
from core.models import EmailVerificationToken, UserProfile

User = get_user_model()

EMAIL_SETTINGS = {
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
    "DEFAULT_FROM_EMAIL": "test@evision.app",
    "FRONTEND_URL": "http://localhost:5173",
    "EMAIL_VERIFICATION_TTL_HOURS": 24,
    # Disable throttling in tests so resend calls don't 429
    "REST_FRAMEWORK": {
        "DEFAULT_AUTHENTICATION_CLASSES": (
            "rest_framework_simplejwt.authentication.JWTAuthentication",
        ),
        "DEFAULT_PERMISSION_CLASSES": (
            "rest_framework.permissions.IsAuthenticatedOrReadOnly",
        ),
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {},
    },
}


def _make_user(username="alice", email="alice@example.com"):
    user = User.objects.create_user(username=username, email=email, password="Testpass1!")
    # Signal creates UserProfile; new users start unverified
    profile = user.profile
    profile.is_email_verified = False
    profile.save(update_fields=["is_email_verified"])
    return user


# ── Token creation ─────────────────────────────────────────────────────────

class CreateVerificationTokenTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_creates_token_with_future_expiry(self):
        with override_settings(**EMAIL_SETTINGS):
            token = create_verification_token(self.user)
        self.assertIsNotNone(token.pk)
        self.assertGreater(token.expires_at, timezone.now())

    def test_token_is_valid_when_fresh(self):
        with override_settings(**EMAIL_SETTINGS):
            token = create_verification_token(self.user)
        self.assertTrue(token.is_valid)

    def test_token_uuid_is_unique(self):
        with override_settings(**EMAIL_SETTINGS):
            t1 = create_verification_token(self.user)
            t2 = create_verification_token(self.user)
        self.assertNotEqual(t1.token, t2.token)


# ── Happy path ──────────────────────────────────────────────────────────────

@override_settings(**EMAIL_SETTINGS)
class VerifyTokenHappyPathTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.token = create_verification_token(self.user)

    def test_valid_token_returns_ok_and_user(self):
        ok, user, error = verify_token(str(self.token.token))
        self.assertTrue(ok)
        self.assertEqual(user.pk, self.user.pk)
        self.assertIsNone(error)

    def test_verification_marks_profile_verified(self):
        verify_token(str(self.token.token))
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.is_email_verified)

    def test_token_is_consumed_after_verification(self):
        verify_token(str(self.token.token))
        self.token.refresh_from_db()
        self.assertIsNotNone(self.token.used_at)
        self.assertFalse(self.token.is_valid)


# ── Edge cases ──────────────────────────────────────────────────────────────

@override_settings(**EMAIL_SETTINGS)
class VerifyTokenEdgeCaseTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_invalid_token_string_returns_error(self):
        ok, user, error = verify_token("not-a-uuid")
        self.assertFalse(ok)
        self.assertIsNone(user)
        self.assertEqual(error, "invalid")

    def test_nonexistent_token_returns_error(self):
        ok, user, error = verify_token("00000000-0000-0000-0000-000000000000")
        self.assertFalse(ok)
        self.assertEqual(error, "invalid")

    def test_expired_token_returns_error(self):
        token = create_verification_token(self.user)
        # Back-date expiry
        token.expires_at = timezone.now() - timedelta(seconds=1)
        token.save(update_fields=["expires_at"])

        ok, user, error = verify_token(str(token.token))
        self.assertFalse(ok)
        self.assertEqual(error, "expired")
        # Profile should still be unverified
        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.is_email_verified)

    def test_already_used_token_returns_error(self):
        token = create_verification_token(self.user)
        verify_token(str(token.token))         # first use — ok
        ok, user, error = verify_token(str(token.token))  # second use
        self.assertFalse(ok)
        self.assertEqual(error, "already_used")


# ── API endpoint tests ──────────────────────────────────────────────────────

@override_settings(**EMAIL_SETTINGS)
class RegisterAPITests(TestCase):
    def test_register_creates_unverified_user_and_sends_email(self):
        resp = self.client.post(
            "/api/auth/register",
            {"username": "bob", "email": "bob@example.com", "password": "Testpass1!", "accept_agreement": False},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data["verification_required"])

        # Profile must be unverified
        user = User.objects.get(username="bob")
        self.assertFalse(user.profile.is_email_verified)

        # One email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("bob@example.com", mail.outbox[0].to)
        self.assertIn("verify-email", mail.outbox[0].body)


@override_settings(**EMAIL_SETTINGS)
class VerifyEmailAPITests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.token = create_verification_token(self.user)

    def test_verify_valid_token(self):
        resp = self.client.post(
            "/api/auth/verify-email",
            {"token": str(self.token.token)},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.is_email_verified)

    def test_verify_expired_token(self):
        self.token.expires_at = timezone.now() - timedelta(seconds=1)
        self.token.save(update_fields=["expires_at"])

        resp = self.client.post(
            "/api/auth/verify-email",
            {"token": str(self.token.token)},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["code"], "expired")

    def test_verify_used_token(self):
        self.client.post(
            "/api/auth/verify-email",
            {"token": str(self.token.token)},
            content_type="application/json",
        )
        resp = self.client.post(
            "/api/auth/verify-email",
            {"token": str(self.token.token)},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["code"], "already_used")

    def test_verify_missing_token(self):
        resp = self.client.post(
            "/api/auth/verify-email", {}, content_type="application/json"
        )
        self.assertEqual(resp.status_code, 400)


@override_settings(**EMAIL_SETTINGS)
class LoginBlockedIfUnverifiedTests(TestCase):
    def setUp(self):
        self.user = _make_user(username="carol", email="carol@example.com")

    def test_unverified_user_gets_403_on_login(self):
        resp = self.client.post(
            "/api/auth/token",
            {"username": "carol", "password": "Testpass1!"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.json()["code"], "email_not_verified")

    def test_verified_user_gets_200_on_login(self):
        self.user.profile.is_email_verified = True
        self.user.profile.save(update_fields=["is_email_verified"])

        resp = self.client.post(
            "/api/auth/token",
            {"username": "carol", "password": "Testpass1!"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.json())

    def test_wrong_password_still_gets_401(self):
        resp = self.client.post(
            "/api/auth/token",
            {"username": "carol", "password": "wrongpassword"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)


@override_settings(**EMAIL_SETTINGS)
class ResendVerificationAPITests(TestCase):
    def setUp(self):
        cache.clear()   # reset throttle counters between tests
        self.user = _make_user(username="dave", email="dave@example.com")

    def test_resend_sends_email_to_unverified_user(self):
        resp = self.client.post(
            "/api/auth/resend-verification",
            {"email": "dave@example.com"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_does_nothing_for_already_verified_user(self):
        self.user.profile.is_email_verified = True
        self.user.profile.save(update_fields=["is_email_verified"])

        resp = self.client.post(
            "/api/auth/resend-verification",
            {"email": "dave@example.com"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)   # still 200 — no enumeration
        self.assertEqual(len(mail.outbox), 0)

    def test_resend_returns_200_for_unknown_email(self):
        resp = self.client.post(
            "/api/auth/resend-verification",
            {"email": "nobody@example.com"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_resend_requires_email_or_username(self):
        resp = self.client.post(
            "/api/auth/resend-verification", {}, content_type="application/json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_resend_works_with_username(self):
        resp = self.client.post(
            "/api/auth/resend-verification",
            {"username": "dave"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
