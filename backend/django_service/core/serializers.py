from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AgreementAcceptance, AnalysisPreset, UserAgreement
from .utils import get_active_agreement

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    accept_agreement = serializers.BooleanField()

    def validate(self, attrs):
        agreement = get_active_agreement()
        if agreement and not attrs.get("accept_agreement"):
            raise serializers.ValidationError(
                "Active user agreement must be accepted before registration."
            )
        return attrs

    def create(self, validated_data):
        agreement = get_active_agreement()
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        if agreement:
            AgreementAcceptance.objects.create(user=user, agreement=agreement)
        return user


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    role = serializers.CharField(read_only=True)
    agreement_accepted = serializers.BooleanField(read_only=True)


class AgreementSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAgreement
        fields = ("id", "version", "title", "content", "published_at")


class AgreementAcceptanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgreementAcceptance
        fields = ("id", "agreement", "accepted_at")
        read_only_fields = ("id", "accepted_at")


class AnalysisPresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisPreset
        fields = ("id", "name", "payload", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value: str):
        value = (value or "").strip()
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters.")
        return value

