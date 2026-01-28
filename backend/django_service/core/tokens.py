from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .utils import has_accepted_active_agreement


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        role = getattr(user, "profile", None)
        token["role"] = role.role if role else "user"
        token["agreement_accepted"] = has_accepted_active_agreement(user)
        return token
