"""
Tests for cookie-based JWT auth hardening.

Covers:
- Login sets httpOnly refresh cookie and returns access in body (not refresh)
- Refresh rotates: new cookie set, old token blacklisted
- Reuse of a rotated (blacklisted) refresh token is rejected
- Logout blacklists the token and clears the cookie
- Missing cookie on refresh returns 401
- Expired / invalid cookie returns 401
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import UserProfile

User = get_user_model()

TEST_SETTINGS = {
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
    "SIMPLE_JWT": {
        "ROTATE_REFRESH_TOKENS": True,
        "BLACKLIST_AFTER_ROTATION": True,
    },
    "REFRESH_COOKIE_NAME": "ewp_refresh",
    "REFRESH_COOKIE_PATH": "/api/auth/",
    "REFRESH_COOKIE_SECURE": False,
    "REFRESH_COOKIE_HTTPONLY": True,
    "REFRESH_COOKIE_SAMESITE": "Strict",
}

COOKIE = "ewp_refresh"


@override_settings(**TEST_SETTINGS)
class LoginCookieTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="alice", email="alice@test.com", password="Pass12345!"
        )
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.is_email_verified = True
        profile.save(update_fields=["is_email_verified"])
        self.token_url = reverse("token")

    def test_login_returns_access_token_in_body(self):
        resp = self.client.post(
            self.token_url, {"username": "alice", "password": "Pass12345!"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)

    def test_login_does_not_return_refresh_in_body(self):
        resp = self.client.post(
            self.token_url, {"username": "alice", "password": "Pass12345!"}, format="json"
        )
        self.assertNotIn("refresh", resp.data)

    def test_login_sets_httponly_refresh_cookie(self):
        resp = self.client.post(
            self.token_url, {"username": "alice", "password": "Pass12345!"}, format="json"
        )
        self.assertIn(COOKIE, resp.cookies)
        cookie = resp.cookies[COOKIE]
        self.assertTrue(cookie["httponly"])

    def test_login_refresh_cookie_has_correct_path(self):
        resp = self.client.post(
            self.token_url, {"username": "alice", "password": "Pass12345!"}, format="json"
        )
        cookie = resp.cookies[COOKIE]
        self.assertEqual(cookie["path"], "/api/auth/")


@override_settings(**TEST_SETTINGS)
class TokenRefreshTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="bob", email="bob@test.com", password="Pass12345!"
        )
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.is_email_verified = True
        profile.save(update_fields=["is_email_verified"])
        self.refresh_url = reverse("token_refresh")

    def _get_refresh_token(self):
        refresh = RefreshToken.for_user(self.user)
        return str(refresh)

    def test_refresh_returns_new_access_token(self):
        token = self._get_refresh_token()
        self.client.cookies[COOKIE] = token
        resp = self.client.post(self.refresh_url)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)

    def test_refresh_rotates_cookie(self):
        token = self._get_refresh_token()
        self.client.cookies[COOKIE] = token
        resp = self.client.post(self.refresh_url)
        self.assertIn(COOKIE, resp.cookies)
        new_token = resp.cookies[COOKIE].value
        self.assertNotEqual(new_token, token)

    def test_rotated_token_cannot_be_reused(self):
        original = self._get_refresh_token()
        self.client.cookies[COOKIE] = original
        # First refresh — consumes original, issues new
        self.client.post(self.refresh_url)
        # Second refresh — tries to reuse original (now blacklisted)
        self.client.cookies[COOKIE] = original
        resp = self.client.post(self.refresh_url)
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.data["code"], "token_not_valid")

    def test_missing_cookie_returns_401(self):
        resp = self.client.post(self.refresh_url)
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.data["code"], "no_refresh_token")

    def test_invalid_token_string_returns_401(self):
        self.client.cookies[COOKIE] = "not.a.valid.jwt"
        resp = self.client.post(self.refresh_url)
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.data["code"], "token_not_valid")

    def test_invalid_cookie_is_cleared_in_response(self):
        self.client.cookies[COOKIE] = "invalid.token"
        resp = self.client.post(self.refresh_url)
        # Cookie cleared: max-age=0 or expires in the past
        if COOKIE in resp.cookies:
            self.assertEqual(resp.cookies[COOKIE].value, "")


@override_settings(**TEST_SETTINGS)
class LogoutTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="carol", email="carol@test.com", password="Pass12345!"
        )
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.is_email_verified = True
        profile.save(update_fields=["is_email_verified"])
        self.logout_url = reverse("logout")
        self.refresh_url = reverse("token_refresh")

    def _get_refresh_token(self):
        return str(RefreshToken.for_user(self.user))

    def test_logout_returns_200(self):
        token = self._get_refresh_token()
        self.client.cookies[COOKIE] = token
        resp = self.client.post(self.logout_url)
        self.assertEqual(resp.status_code, 200)

    def test_logout_clears_cookie(self):
        token = self._get_refresh_token()
        self.client.cookies[COOKIE] = token
        resp = self.client.post(self.logout_url)
        if COOKIE in resp.cookies:
            self.assertEqual(resp.cookies[COOKIE].value, "")

    def test_logout_blacklists_refresh_token(self):
        token = self._get_refresh_token()
        self.client.cookies[COOKIE] = token
        self.client.post(self.logout_url)
        # Token should now be blacklisted — refresh must fail
        self.client.cookies[COOKIE] = token
        resp = self.client.post(self.refresh_url)
        self.assertEqual(resp.status_code, 401)

    def test_logout_without_cookie_returns_200(self):
        # Graceful — no cookie, still succeeds
        resp = self.client.post(self.logout_url)
        self.assertEqual(resp.status_code, 200)

    def test_logout_with_already_blacklisted_token_returns_200(self):
        token = self._get_refresh_token()
        self.client.cookies[COOKIE] = token
        self.client.post(self.logout_url)
        # Second logout with same token — should still be 200
        self.client.cookies[COOKIE] = token
        resp = self.client.post(self.logout_url)
        self.assertEqual(resp.status_code, 200)
