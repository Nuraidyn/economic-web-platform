from typing import Optional

from .models import AgreementAcceptance, UserAgreement


def get_active_agreement() -> Optional[UserAgreement]:
    return (
        UserAgreement.objects.filter(is_active=True)
        .order_by("-published_at", "-id")
        .first()
    )


def has_accepted_active_agreement(user) -> bool:
    if not user.is_authenticated:
        return False
    agreement = get_active_agreement()
    if not agreement:
        return True
    return AgreementAcceptance.objects.filter(user=user, agreement=agreement).exists()
