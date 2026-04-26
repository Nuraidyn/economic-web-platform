from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .utils import has_accepted_active_agreement


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        profile = getattr(user, "profile", None)
        token["role"] = profile.role if profile else "user"
        token["agreement_accepted"] = has_accepted_active_agreement(user)
        pwd_changed_at = getattr(profile, "password_changed_at", None) if profile else None
        token["pwd_changed_at"] = int(pwd_changed_at.timestamp()) if pwd_changed_at else 0
        return token
