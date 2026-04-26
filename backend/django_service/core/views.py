from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .email_verification import create_verification_token, send_verification_email, verify_token
from .models import AgreementAcceptance, AnalysisPreset
from .password_reset import create_reset_token, reset_password, send_reset_email
from .serializers import (
    AgreementSerializer,
    AnalysisPresetSerializer,
    ForgotPasswordSerializer,
    GoogleAuthSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    ResetPasswordSerializer,
    UserSerializer,
)
from .social_auth import find_or_create_google_user, verify_google_token
from .tokens import CustomTokenObtainPairSerializer
from .utils import get_active_agreement, has_accepted_active_agreement

User = get_user_model()


# ── Cookie helpers ────────────────────────────────────────────────────────────

def _cookie_name() -> str:
    return getattr(settings, "REFRESH_COOKIE_NAME", "ewp_refresh")


def _set_refresh_cookie(response, refresh_token: str) -> None:
    response.set_cookie(
        key=_cookie_name(),
        value=refresh_token,
        max_age=getattr(settings, "REFRESH_COOKIE_MAX_AGE", 7 * 24 * 60 * 60),
        httponly=getattr(settings, "REFRESH_COOKIE_HTTPONLY", True),
        secure=getattr(settings, "REFRESH_COOKIE_SECURE", False),
        samesite=getattr(settings, "REFRESH_COOKIE_SAMESITE", "Strict"),
        path=getattr(settings, "REFRESH_COOKIE_PATH", "/api/auth/"),
    )


def _clear_refresh_cookie(response) -> None:
    response.delete_cookie(
        key=_cookie_name(),
        path=getattr(settings, "REFRESH_COOKIE_PATH", "/api/auth/"),
        samesite=getattr(settings, "REFRESH_COOKIE_SAMESITE", "Strict"),
    )


_VERIFY_ERRORS = {
    "invalid": "Verification link is invalid.",
    "expired": "Verification link has expired. Please request a new one.",
    "already_used": "This link has already been used. Try signing in.",
}


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()

        token = create_verification_token(user)
        send_verification_email(user, token)

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "verification_required": True,
            },
            status=status.HTTP_201_CREATED,
        )


class CustomTokenView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        # Check for unverified email BEFORE SimpleJWT authenticates, so we can
        # return a distinct 403 code that the frontend can act on specifically.
        try:
            user = User.objects.select_related("profile").get(username=username)
            if user.check_password(password):
                profile = getattr(user, "profile", None)
                if profile and not profile.is_email_verified:
                    return Response(
                        {
                            "code": "email_not_verified",
                            "detail": "Please verify your email address before logging in.",
                            "email": user.email,
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
        except User.DoesNotExist:
            pass

        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Move refresh token from response body into a httpOnly cookie.
            refresh = response.data.pop("refresh", None)
            if refresh:
                _set_refresh_cookie(response, refresh)
        return response


class CookieTokenRefreshView(APIView):
    """
    Reads the refresh token from the httpOnly cookie, rotates it, and returns
    a fresh access token in the JSON body. The new refresh token is written back
    into the cookie (rotation). Blacklists the consumed token automatically via
    SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"].
    """
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        refresh_token = request.COOKIES.get(_cookie_name())
        if not refresh_token:
            return Response(
                {"detail": "No refresh token.", "code": "no_refresh_token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken):
            response = Response(
                {"detail": "Token is invalid or expired.", "code": "token_not_valid"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_refresh_cookie(response)
            return response

        response = Response({"access": serializer.validated_data["access"]})
        if "refresh" in serializer.validated_data:
            _set_refresh_cookie(response, serializer.validated_data["refresh"])
        return response


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get("token") or request.query_params.get("token", "")
        if not token_str:
            return Response(
                {"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        ok, user, error_code = verify_token(str(token_str))
        if not ok:
            return Response(
                {
                    "code": error_code,
                    "detail": _VERIFY_ERRORS.get(error_code, "Verification failed."),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Email verified successfully.", "username": user.username},
            status=status.HTTP_200_OK,
        )


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "resend_verification"

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.get("email", "")
        username = serializer.validated_data.get("username", "")

        user = None
        try:
            if email:
                user = User.objects.select_related("profile").get(email=email)
            elif username:
                user = User.objects.select_related("profile").get(username=username)
        except User.DoesNotExist:
            pass

        if user and user.email:
            profile = getattr(user, "profile", None)
            if profile and not profile.is_email_verified:
                token = create_verification_token(user)
                send_verification_email(user, token)

        # Always 200 — prevents user enumeration
        return Response(
            {"detail": "If the account exists and is unverified, a new email has been sent."},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    Blacklists the refresh token from the cookie and clears it.
    Requires no authentication — the cookie is enough to identify the session.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(_cookie_name())
        response = Response({"detail": "Logged out."}, status=status.HTTP_200_OK)
        _clear_refresh_cookie(response)

        if refresh_token:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass  # Already invalid / blacklisted — that's fine

        return response


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if not getattr(settings, "GOOGLE_CLIENT_ID", ""):
            return Response(
                {"code": "not_configured", "detail": "Google authentication is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            idinfo = verify_google_token(serializer.validated_data["credential"])
        except ValueError:
            return Response(
                {"code": "invalid_token", "detail": "Google token verification failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = find_or_create_google_user(idinfo)
        token = CustomTokenObtainPairSerializer.get_token(user)
        response = Response({"access": str(token.access_token)}, status=status.HTTP_200_OK)
        _set_refresh_cookie(response, str(token))
        return response


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "forgot_password"

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            # Always 200 to prevent timing-based user enumeration
            return Response(
                {"detail": "If the email exists, a reset link has been sent."},
                status=status.HTTP_200_OK,
            )

        email = serializer.validated_data["email"]
        try:
            user = User.objects.select_related("profile").get(email=email)
            if user.email:
                token = create_reset_token(user)
                send_reset_email(user, token)
        except User.DoesNotExist:
            pass

        return Response(
            {"detail": "If the email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


_RESET_ERRORS = {
    "invalid": "Reset link is invalid.",
    "expired": "Reset link has expired. Please request a new one.",
    "already_used": "This link has already been used.",
    "weak_password": "Password does not meet requirements.",
}


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_str = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        ok, user, error_code = reset_password(token_str, new_password)
        if not ok:
            return Response(
                {
                    "code": error_code,
                    "detail": _RESET_ERRORS.get(error_code, "Password reset failed."),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Password reset successfully. You can now log in."},
            status=status.HTTP_200_OK,
        )


class ActiveAgreementView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        agreement = get_active_agreement()
        if not agreement:
            return Response({"active": False}, status=status.HTTP_200_OK)
        data = AgreementSerializer(agreement).data
        data["active"] = True
        return Response(data)


class AcceptAgreementView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "agreements"

    def post(self, request):
        agreement = get_active_agreement()
        if not agreement:
            return Response({"detail": "No active agreement"}, status=status.HTTP_404_NOT_FOUND)
        acceptance, created = AgreementAcceptance.objects.get_or_create(
            user=request.user,
            agreement=agreement,
            defaults={"ip_address": request.META.get("REMOTE_ADDR")},
        )
        if not created:
            return Response({"detail": "Agreement already accepted"}, status=status.HTTP_200_OK)
        return Response({"detail": "Agreement accepted"}, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        data = {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "role": profile.role if profile else "user",
            "agreement_accepted": has_accepted_active_agreement(request.user),
            "email_verified": profile.is_email_verified if profile else True,
        }
        return Response(data)


class IntrospectTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)

        # Invalidate tokens issued before the last password reset.
        token_payload = getattr(request.auth, "payload", {}) if request.auth else {}
        token_pwd_ts = token_payload.get("pwd_changed_at", 0)
        profile_pwd_at = getattr(profile, "password_changed_at", None) if profile else None
        if profile_pwd_at is not None and int(profile_pwd_at.timestamp()) > token_pwd_ts:
            return Response(
                {"detail": "Token invalidated after password change."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "user_id": request.user.id,
                "role": profile.role if profile else "user",
                "agreement_accepted": has_accepted_active_agreement(request.user),
            }
        )


class PresetsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        presets = AnalysisPreset.objects.filter(user=request.user).order_by("-updated_at", "-id")
        return Response(AnalysisPresetSerializer(presets, many=True).data)

    def post(self, request):
        serializer = AnalysisPresetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        name = serializer.validated_data["name"]
        if AnalysisPreset.objects.filter(user=request.user, name=name).exists():
            return Response(
                {"detail": "Preset name already exists."},
                status=status.HTTP_409_CONFLICT,
            )
        preset = AnalysisPreset.objects.create(user=request.user, **serializer.validated_data)
        return Response(AnalysisPresetSerializer(preset).data, status=status.HTTP_201_CREATED)


class PresetDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, preset_id: int) -> AnalysisPreset:
        return AnalysisPreset.objects.get(id=preset_id, user=request.user)

    def get(self, request, preset_id: int):
        try:
            preset = self.get_object(request, preset_id)
        except AnalysisPreset.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AnalysisPresetSerializer(preset).data)

    def put(self, request, preset_id: int):
        try:
            preset = self.get_object(request, preset_id)
        except AnalysisPreset.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AnalysisPresetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        name = serializer.validated_data["name"]
        duplicate = (
            AnalysisPreset.objects.filter(user=request.user, name=name)
            .exclude(id=preset.id)
            .exists()
        )
        if duplicate:
            return Response({"detail": "Preset name already exists."}, status=status.HTTP_409_CONFLICT)

        preset.name = name
        preset.payload = serializer.validated_data["payload"]
        preset.save(update_fields=["name", "payload", "updated_at"])
        return Response(AnalysisPresetSerializer(preset).data)

    def delete(self, request, preset_id: int):
        try:
            preset = self.get_object(request, preset_id)
        except AnalysisPreset.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        preset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
