from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import AgreementAcceptance, AnalysisPreset
from .serializers import AgreementSerializer, AnalysisPresetSerializer, RegisterSerializer, UserSerializer
from .tokens import CustomTokenObtainPairSerializer
from .utils import get_active_agreement, has_accepted_active_agreement

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        profile = getattr(user, "profile", None)
        payload = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": profile.role if profile else "user",
            "agreement_accepted": has_accepted_active_agreement(user),
        }
        return Response(payload, status=status.HTTP_201_CREATED)


class CustomTokenView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = "auth"


class CustomTokenRefreshView(TokenRefreshView):
    throttle_scope = "auth"


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
        }
        return Response(data)


class IntrospectTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
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
