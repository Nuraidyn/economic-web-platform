"""
Tests for the Google OAuth2 social auth flow.

verify_google_token() is mocked throughout — we test our own logic, not Google's SDK.
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import SocialAccount, UserProfile
from core.social_auth import _generate_username, find_or_create_google_user

User = get_user_model()

TEST_SETTINGS = {
    "GOOGLE_CLIENT_ID": "test-client-id.apps.googleusercontent.com",
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

SAMPLE_IDINFO = {
    "sub": "108204483652833896701",
    "email": "alice@gmail.com",
    "email_verified": True,
    "name": "Alice Smith",
    "picture": "https://lh3.googleusercontent.com/photo.jpg",
    "given_name": "Alice",
    "family_name": "Smith",
    "aud": "test-client-id.apps.googleusercontent.com",
}


@override_settings(**TEST_SETTINGS)
class FindOrCreateGoogleUserTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_creates_new_user_for_unknown_google_sub(self):
        user = find_or_create_google_user(SAMPLE_IDINFO)
        self.assertIsNotNone(user.pk)
        self.assertEqual(user.email, "alice@gmail.com")
        self.assertTrue(SocialAccount.objects.filter(provider="google", user=user).exists())

    def test_new_user_email_is_marked_verified(self):
        user = find_or_create_google_user(SAMPLE_IDINFO)
        profile = UserProfile.objects.get(user=user)
        self.assertTrue(profile.is_email_verified)

    def test_new_user_has_unusable_password(self):
        user = find_or_create_google_user(SAMPLE_IDINFO)
        self.assertFalse(user.has_usable_password())

    def test_existing_social_account_returns_same_user(self):
        first = find_or_create_google_user(SAMPLE_IDINFO)
        second = find_or_create_google_user(SAMPLE_IDINFO)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(SocialAccount.objects.filter(provider="google", provider_uid=SAMPLE_IDINFO["sub"]).count(), 1)

    def test_links_to_existing_user_with_same_email(self):
        existing = User.objects.create_user(
            username="alice_existing", email="alice@gmail.com", password="SomePass123!"
        )
        user = find_or_create_google_user(SAMPLE_IDINFO)
        self.assertEqual(user.pk, existing.pk)
        self.assertTrue(SocialAccount.objects.filter(provider="google", user=existing).exists())

    def test_marks_email_verified_on_email_linked_user(self):
        existing = User.objects.create_user(
            username="alice_existing", email="alice@gmail.com", password="SomePass123!"
        )
        profile, _ = UserProfile.objects.get_or_create(user=existing)
        self.assertFalse(profile.is_email_verified)
        find_or_create_google_user(SAMPLE_IDINFO)
        profile.refresh_from_db()
        self.assertTrue(profile.is_email_verified)

    def test_different_google_sub_creates_different_user(self):
        user1 = find_or_create_google_user(SAMPLE_IDINFO)
        other_idinfo = {**SAMPLE_IDINFO, "sub": "999888777666555444333", "email": "bob@gmail.com"}
        user2 = find_or_create_google_user(other_idinfo)
        self.assertNotEqual(user1.pk, user2.pk)

    def test_unverified_email_does_not_mark_profile(self):
        idinfo = {**SAMPLE_IDINFO, "email_verified": False}
        user = find_or_create_google_user(idinfo)
        profile = UserProfile.objects.get(user=user)
        self.assertFalse(profile.is_email_verified)


@override_settings(**TEST_SETTINGS)
class GenerateUsernameTests(TestCase):
    def test_generates_from_email_prefix(self):
        username = _generate_username("john.doe")
        self.assertEqual(username, "john_doe")

    def test_handles_conflict_by_incrementing(self):
        User.objects.create_user(username="alice", email="a@x.com", password="x")
        username = _generate_username("alice")
        self.assertEqual(username, "alice_1")

    def test_multiple_conflicts(self):
        User.objects.create_user(username="bob", email="b1@x.com", password="x")
        User.objects.create_user(username="bob_1", email="b2@x.com", password="x")
        username = _generate_username("bob")
        self.assertEqual(username, "bob_2")

    def test_sanitizes_special_chars(self):
        username = _generate_username("user+tag@example")
        self.assertRegex(username, r"^\w+$")


@override_settings(**TEST_SETTINGS)
class GoogleAuthAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.url = reverse("google_auth")

    @patch("core.views.verify_google_token", return_value=SAMPLE_IDINFO)
    def test_valid_credential_returns_tokens(self, mock_verify):
        resp = self.client.post(self.url, {"credential": "fake.id.token"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)
        self.assertNotIn("refresh", resp.data)
        self.assertIn("ewp_refresh", resp.cookies)

    @patch("core.views.verify_google_token", return_value=SAMPLE_IDINFO)
    def test_creates_user_and_social_account(self, mock_verify):
        self.client.post(self.url, {"credential": "fake.id.token"}, format="json")
        self.assertEqual(User.objects.filter(email="alice@gmail.com").count(), 1)
        self.assertEqual(SocialAccount.objects.filter(provider="google").count(), 1)

    @patch("core.social_auth.verify_google_token", side_effect=ValueError("bad token"))
    def test_invalid_token_returns_400(self, mock_verify):
        resp = self.client.post(self.url, {"credential": "bad_token"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["code"], "invalid_token")

    def test_missing_credential_returns_400(self):
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, 400)

    @override_settings(GOOGLE_CLIENT_ID="")
    def test_not_configured_returns_503(self):
        resp = self.client.post(self.url, {"credential": "any"}, format="json")
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.data["code"], "not_configured")

    @patch("core.views.verify_google_token", return_value=SAMPLE_IDINFO)
    def test_second_login_returns_same_user(self, mock_verify):
        self.client.post(self.url, {"credential": "fake.id.token"}, format="json")
        self.client.post(self.url, {"credential": "fake.id.token"}, format="json")
        self.assertEqual(User.objects.filter(email="alice@gmail.com").count(), 1)

    @patch("core.views.verify_google_token", return_value=SAMPLE_IDINFO)
    def test_links_existing_user_by_email(self, mock_verify):
        existing = User.objects.create_user(
            username="alice_old", email="alice@gmail.com", password="Pass12345!"
        )
        resp = self.client.post(self.url, {"credential": "fake.id.token"}, format="json")
        self.assertEqual(resp.status_code, 200)
        # Confirm the same user was returned (not a new one)
        self.assertEqual(User.objects.filter(email="alice@gmail.com").count(), 1)
        self.assertTrue(SocialAccount.objects.filter(user=existing, provider="google").exists())
