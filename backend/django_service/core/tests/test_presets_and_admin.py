from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from core.admin import UserAdmin
from core.models import AnalysisPreset, UserProfile


User = get_user_model()


class PresetsApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="verystrongpass",
        )
        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="verystrongpass",
        )
        self.presets_url = "/api/presets"
        self.client.force_authenticate(user=self.user)

    def test_presets_crud_and_name_conflicts(self):
        create_a = self.client.post(
            self.presets_url,
            {
                "name": "Main preset",
                "payload": {
                    "countries": ["KZ"],
                    "indicators": ["FP.CPI.TOTL.ZG"],
                    "startYear": 2006,
                    "endYear": 2024,
                },
            },
            format="json",
        )
        self.assertEqual(create_a.status_code, status.HTTP_201_CREATED)
        preset_a_id = create_a.data["id"]

        create_duplicate = self.client.post(
            self.presets_url,
            {
                "name": "Main preset",
                "payload": {"countries": ["US"]},
            },
            format="json",
        )
        self.assertEqual(create_duplicate.status_code, status.HTTP_409_CONFLICT)

        create_b = self.client.post(
            self.presets_url,
            {
                "name": "Backup preset",
                "payload": {"countries": ["US"], "indicators": ["SI.POV.GINI"]},
            },
            format="json",
        )
        self.assertEqual(create_b.status_code, status.HTTP_201_CREATED)
        preset_b_id = create_b.data["id"]

        listing = self.client.get(self.presets_url)
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 2)

        update_conflict = self.client.put(
            f"{self.presets_url}/{preset_a_id}",
            {
                "name": "Backup preset",
                "payload": {"countries": ["KZ"]},
            },
            format="json",
        )
        self.assertEqual(update_conflict.status_code, status.HTTP_409_CONFLICT)

        update_ok = self.client.put(
            f"{self.presets_url}/{preset_a_id}",
            {
                "name": "Updated main",
                "payload": {"countries": ["BR"], "chartType": "line"},
            },
            format="json",
        )
        self.assertEqual(update_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(update_ok.data["name"], "Updated main")

        delete_response = self.client.delete(f"{self.presets_url}/{preset_b_id}")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        detail_after_delete = self.client.get(f"{self.presets_url}/{preset_b_id}")
        self.assertEqual(detail_after_delete.status_code, status.HTTP_404_NOT_FOUND)

    def test_presets_are_isolated_per_user(self):
        foreign_preset = AnalysisPreset.objects.create(
            user=self.other_user,
            name="Other user preset",
            payload={"countries": ["DE"]},
        )

        get_response = self.client.get(f"{self.presets_url}/{foreign_preset.id}")
        delete_response = self.client.delete(f"{self.presets_url}/{foreign_preset.id}")

        self.assertEqual(get_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(delete_response.status_code, status.HTTP_404_NOT_FOUND)


class AdminRoleManagementTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user_admin = UserAdmin(User, admin.site)

        self.superuser = User.objects.create_superuser(
            username="root",
            email="root@example.com",
            password="verystrongpass",
        )
        self.platform_admin = User.objects.create_user(
            username="platform_admin",
            email="admin@example.com",
            password="verystrongpass",
        )
        self.regular_user = User.objects.create_user(
            username="simple_user",
            email="simple@example.com",
            password="verystrongpass",
        )

        self.platform_admin.profile.role = UserProfile.ROLE_ADMIN
        self.platform_admin.profile.save(update_fields=["role"])
        self.platform_admin.refresh_from_db()

    def _request_as(self, user):
        request = self.factory.get("/admin/auth/user/")
        request.user = user
        return request

    def test_platform_admin_has_user_management_permissions_but_not_superuser_control(self):
        request = self._request_as(self.platform_admin)

        self.assertTrue(self.user_admin.has_module_permission(request))
        self.assertTrue(self.user_admin.has_view_permission(request, self.regular_user))
        self.assertTrue(self.user_admin.has_change_permission(request, self.regular_user))
        self.assertTrue(self.user_admin.has_delete_permission(request, self.regular_user))

        self.assertFalse(self.user_admin.has_view_permission(request, self.superuser))
        self.assertFalse(self.user_admin.has_change_permission(request, self.superuser))
        self.assertFalse(self.user_admin.has_delete_permission(request, self.superuser))

    def test_platform_admin_readonly_fields_protect_privileged_flags(self):
        request = self._request_as(self.platform_admin)
        readonly = self.user_admin.get_readonly_fields(request, self.regular_user)

        self.assertIn("is_superuser", readonly)
        self.assertIn("groups", readonly)
        self.assertIn("user_permissions", readonly)
        self.assertIn("is_staff", readonly)

    def test_role_signal_syncs_is_staff_flag(self):
        self.assertFalse(self.regular_user.is_staff)

        profile = self.regular_user.profile
        profile.role = UserProfile.ROLE_ADMIN
        profile.save(update_fields=["role"])
        self.regular_user.refresh_from_db()
        self.assertTrue(self.regular_user.is_staff)

        profile.role = UserProfile.ROLE_USER
        profile.save(update_fields=["role"])
        self.regular_user.refresh_from_db()
        self.assertFalse(self.regular_user.is_staff)
