"""
Tests for the password reset flow.

Covers:
- Token creation + TTL
- ForgotPasswordView (valid email, unknown email, invalid input — all 200)
- ResetPasswordView (valid, expired, used, invalid token, weak password)
- Session invalidation via password_changed_at / IntrospectTokenView
"""
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.models import PasswordResetToken, UserProfile
from core.password_reset import create_reset_token, reset_password

User = get_user_model()

TEST_SETTINGS = {
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
    "PASSWORD_RESET_TTL_MINUTES": 60,
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


@override_settings(**TEST_SETTINGS)
class PasswordResetTokenTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="tokenuser", email="token@example.com", password="OldPass123!"
        )
        UserProfile.objects.get_or_create(user=self.user, defaults={"is_email_verified": True})

    def test_token_is_valid_when_fresh(self):
        token = create_reset_token(self.user)
        self.assertTrue(token.is_valid)

    def test_token_invalid_after_expiry(self):
        token = create_reset_token(self.user)
        token.expires_at = timezone.now() - timedelta(minutes=1)
        token.save()
        self.assertFalse(token.is_valid)

    def test_token_invalid_after_consume(self):
        token = create_reset_token(self.user)
        token.consume()
        self.assertFalse(token.is_valid)

    def test_reset_password_updates_user_password(self):
        token = create_reset_token(self.user)
        ok, user, err = reset_password(str(token.token), "NewSecure123!")
        self.assertTrue(ok)
        self.assertIsNone(err)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewSecure123!"))

    def test_reset_password_sets_password_changed_at(self):
        token = create_reset_token(self.user)
        before = timezone.now()
        reset_password(str(token.token), "NewSecure123!")
        profile = UserProfile.objects.get(user=self.user)
        self.assertIsNotNone(profile.password_changed_at)
        self.assertGreaterEqual(profile.password_changed_at, before)

    def test_reset_password_consumes_token(self):
        token = create_reset_token(self.user)
        reset_password(str(token.token), "NewSecure123!")
        token.refresh_from_db()
        self.assertIsNotNone(token.used_at)

    def test_reset_password_invalid_token(self):
        ok, user, err = reset_password("not-a-uuid", "NewSecure123!")
        self.assertFalse(ok)
        self.assertEqual(err, "invalid")

    def test_reset_password_unknown_uuid(self):
        import uuid
        ok, user, err = reset_password(str(uuid.uuid4()), "NewSecure123!")
        self.assertFalse(ok)
        self.assertEqual(err, "invalid")

    def test_reset_password_expired_token(self):
        token = create_reset_token(self.user)
        token.expires_at = timezone.now() - timedelta(minutes=1)
        token.save()
        ok, user, err = reset_password(str(token.token), "NewSecure123!")
        self.assertFalse(ok)
        self.assertEqual(err, "expired")

    def test_reset_password_already_used_token(self):
        token = create_reset_token(self.user)
        reset_password(str(token.token), "NewSecure123!")
        ok, user, err = reset_password(str(token.token), "AnotherPass456!")
        self.assertFalse(ok)
        self.assertEqual(err, "already_used")

    def test_reset_password_weak_password(self):
        token = create_reset_token(self.user)
        ok, user, err = reset_password(str(token.token), "short")
        self.assertFalse(ok)
        self.assertEqual(err, "weak_password")


@override_settings(**TEST_SETTINGS)
class ForgotPasswordAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="forgotuser", email="forgot@example.com", password="Pass12345!"
        )
        UserProfile.objects.get_or_create(user=self.user, defaults={"is_email_verified": True})
        self.url = reverse("forgot_password")

    def test_valid_email_returns_200(self):
        resp = self.client.post(self.url, {"email": "forgot@example.com"}, format="json")
        self.assertEqual(resp.status_code, 200)

    def test_unknown_email_returns_200(self):
        resp = self.client.post(self.url, {"email": "nobody@example.com"}, format="json")
        self.assertEqual(resp.status_code, 200)

    def test_invalid_email_returns_200(self):
        # Even invalid email format: always 200 (no enumeration)
        resp = self.client.post(self.url, {"email": "not-an-email"}, format="json")
        self.assertEqual(resp.status_code, 200)

    def test_valid_email_creates_token(self):
        self.client.post(self.url, {"email": "forgot@example.com"}, format="json")
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 1)

    def test_unknown_email_does_not_create_token(self):
        self.client.post(self.url, {"email": "nobody@example.com"}, format="json")
        self.assertEqual(PasswordResetToken.objects.count(), 0)

    @patch("core.password_reset.send_mail")
    def test_valid_email_sends_email(self, mock_send):
        self.client.post(self.url, {"email": "forgot@example.com"}, format="json")
        mock_send.assert_called_once()

    @patch("core.password_reset.send_mail")
    def test_unknown_email_does_not_send_email(self, mock_send):
        self.client.post(self.url, {"email": "nobody@example.com"}, format="json")
        mock_send.assert_not_called()


@override_settings(**TEST_SETTINGS)
class ResetPasswordAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="resetuser", email="reset@example.com", password="OldPass123!"
        )
        UserProfile.objects.get_or_create(user=self.user, defaults={"is_email_verified": True})
        self.url = reverse("reset_password")

    def test_valid_reset(self):
        token = create_reset_token(self.user)
        resp = self.client.post(
            self.url, {"token": str(token.token), "new_password": "NewPass123!"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass123!"))

    def test_expired_token(self):
        token = create_reset_token(self.user)
        token.expires_at = timezone.now() - timedelta(minutes=1)
        token.save()
        resp = self.client.post(
            self.url, {"token": str(token.token), "new_password": "NewPass123!"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["code"], "expired")

    def test_already_used_token(self):
        token = create_reset_token(self.user)
        self.client.post(
            self.url, {"token": str(token.token), "new_password": "NewPass123!"}, format="json"
        )
        resp = self.client.post(
            self.url, {"token": str(token.token), "new_password": "AnotherPass456!"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["code"], "already_used")

    def test_invalid_token(self):
        resp = self.client.post(
            self.url, {"token": "not-a-uuid", "new_password": "NewPass123!"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["code"], "invalid")

    def test_weak_password_rejected(self):
        token = create_reset_token(self.user)
        # "12345678" passes min_length=8 but fails NumericPasswordValidator
        resp = self.client.post(
            self.url, {"token": str(token.token), "new_password": "12345678"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["code"], "weak_password")

    def test_missing_fields_returns_400(self):
        resp = self.client.post(self.url, {"new_password": "NewPass123!"}, format="json")
        self.assertEqual(resp.status_code, 400)


@override_settings(**TEST_SETTINGS)
class SessionInvalidationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="sessionuser", email="session@example.com", password="OldPass123!"
        )
        profile, _ = UserProfile.objects.get_or_create(
            user=self.user, defaults={"is_email_verified": True}
        )
        self.profile = profile
        self.introspect_url = reverse("introspect")

    def _get_token(self):
        access = AccessToken.for_user(self.user)
        profile = getattr(self.user, "profile", None)
        pwd_changed_at = getattr(profile, "password_changed_at", None) if profile else None
        access["pwd_changed_at"] = int(pwd_changed_at.timestamp()) if pwd_changed_at else 0
        return str(access)

    def test_introspect_succeeds_before_password_reset(self):
        token = self._get_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = self.client.get(self.introspect_url)
        self.assertEqual(resp.status_code, 200)

    def test_introspect_fails_after_password_reset(self):
        old_token = self._get_token()

        # Reset password — updates password_changed_at
        reset_token = create_reset_token(self.user)
        reset_password(str(reset_token.token), "NewPass123!")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {old_token}")
        resp = self.client.get(self.introspect_url)
        self.assertEqual(resp.status_code, 401)

    def test_new_token_after_reset_succeeds(self):
        reset_token = create_reset_token(self.user)
        reset_password(str(reset_token.token), "NewPass123!")

        # Re-load user so profile has updated password_changed_at
        self.user.refresh_from_db()
        new_token = self._get_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {new_token}")
        resp = self.client.get(self.introspect_url)
        self.assertEqual(resp.status_code, 200)
