from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import AgreementAcceptance, UserAgreement, UserProfile


User = get_user_model()


class AuthAndAgreementApiTests(APITestCase):
    def setUp(self):
        self.register_url = "/api/auth/register"
        self.token_url = "/api/auth/token"
        self.me_url = "/api/auth/me"
        self.introspect_url = "/api/auth/introspect"
        self.active_agreement_url = "/api/agreements/active"
        self.accept_agreement_url = "/api/agreements/accept"

    def _create_active_agreement(self) -> UserAgreement:
        return UserAgreement.objects.create(
            version="v1",
            title="Terms",
            content="Sample agreement",
            is_active=True,
            published_at=timezone.now(),
        )

    def test_active_agreement_returns_inactive_when_not_configured(self):
        response = self.client.get(self.active_agreement_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"active": False})

    def test_register_requires_acceptance_when_active_agreement_exists(self):
        self._create_active_agreement()

        response = self.client.post(
            self.register_url,
            {
                "username": "alice",
                "email": "alice@example.com",
                "password": "verystrongpass",
                "accept_agreement": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Active user agreement must be accepted", str(response.data))

    def test_register_creates_profile_and_acceptance(self):
        agreement = self._create_active_agreement()

        response = self.client.post(
            self.register_url,
            {
                "username": "bob",
                "email": "bob@example.com",
                "password": "verystrongpass",
                "accept_agreement": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], "bob")
        self.assertEqual(response.data["role"], UserProfile.ROLE_USER)
        self.assertTrue(response.data["agreement_accepted"])

        user = User.objects.get(username="bob")
        self.assertTrue(hasattr(user, "profile"))
        self.assertTrue(
            AgreementAcceptance.objects.filter(user=user, agreement=agreement).exists()
        )

    def test_accept_agreement_is_idempotent(self):
        agreement = self._create_active_agreement()
        user = User.objects.create_user(
            username="charlie",
            email="charlie@example.com",
            password="verystrongpass",
        )
        self.client.force_authenticate(user=user)

        first_response = self.client.post(self.accept_agreement_url)
        second_response = self.client.post(self.accept_agreement_url)

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            AgreementAcceptance.objects.filter(user=user, agreement=agreement).count(),
            1,
        )

    def test_me_and_introspect_return_role_and_agreement_state(self):
        agreement = self._create_active_agreement()
        user = User.objects.create_user(
            username="dana",
            email="dana@example.com",
            password="verystrongpass",
        )
        user.profile.role = UserProfile.ROLE_RESEARCHER
        user.profile.save(update_fields=["role"])
        AgreementAcceptance.objects.create(user=user, agreement=agreement)

        self.client.force_authenticate(user=user)

        me_response = self.client.get(self.me_url)
        introspect_response = self.client.get(self.introspect_url)

        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["role"], UserProfile.ROLE_RESEARCHER)
        self.assertTrue(me_response.data["agreement_accepted"])

        self.assertEqual(introspect_response.status_code, status.HTTP_200_OK)
        self.assertEqual(introspect_response.data["role"], UserProfile.ROLE_RESEARCHER)
        self.assertTrue(introspect_response.data["agreement_accepted"])

    def test_jwt_auth_flow_and_introspection(self):
        self._create_active_agreement()
        user = User.objects.create_user(
            username="eric",
            email="eric@example.com",
            password="verystrongpass",
        )

        token_response = self.client.post(
            self.token_url,
            {"username": user.username, "password": "verystrongpass"},
            format="json",
        )

        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", token_response.data)

        access_token = token_response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        introspect_response = self.client.get(self.introspect_url)

        self.assertEqual(introspect_response.status_code, status.HTTP_200_OK)
        self.assertEqual(introspect_response.data["user_id"], user.id)
        self.assertEqual(introspect_response.data["role"], UserProfile.ROLE_USER)
        self.assertFalse(introspect_response.data["agreement_accepted"])
