import uuid

from django.db import models
from django.utils import timezone


class UserAgreement(models.Model):
    version = models.CharField(max_length=32)
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_active = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.version})"


class AgreementAcceptance(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    agreement = models.ForeignKey(UserAgreement, on_delete=models.CASCADE)
    accepted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "agreement")

    def __str__(self):
        return f"{self.user_id} accepted {self.agreement_id}"


class UserProfile(models.Model):
    ROLE_GUEST = "guest"
    ROLE_USER = "user"
    ROLE_RESEARCHER = "researcher"
    ROLE_ADMIN = "admin"
    ROLE_CHOICES = [
        (ROLE_GUEST, "Guest"),
        (ROLE_USER, "Registered User"),
        (ROLE_RESEARCHER, "Researcher"),
        (ROLE_ADMIN, "Admin"),
    ]

    user = models.OneToOneField("auth.User", on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=24, choices=ROLE_CHOICES, default=ROLE_USER)
    is_email_verified = models.BooleanField(default=False)
    password_changed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user_id}:{self.role}"


class AnalysisPreset(models.Model):
    """
    Saved analysis session/preset for a user.

    Payload is frontend-owned JSON (selected countries/indicators, chart type, filters, etc.).
    """

    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="analysis_presets")
    name = models.CharField(max_length=120)
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "name")
        ordering = ("-updated_at", "-id")

    def __str__(self):
        return f"{self.user_id}:{self.name}"


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="verification_tokens"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_valid(self) -> bool:
        return self.used_at is None and timezone.now() < self.expires_at

    def consume(self) -> None:
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    def __str__(self):
        return f"token:{self.token} user:{self.user_id}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="password_reset_tokens"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_valid(self) -> bool:
        return self.used_at is None and timezone.now() < self.expires_at

    def consume(self) -> None:
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    def __str__(self):
        return f"pwd_reset:{self.token} user:{self.user_id}"


class SocialAccount(models.Model):
    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="social_accounts"
    )
    provider = models.CharField(max_length=32)
    provider_uid = models.CharField(max_length=255)
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("provider", "provider_uid")

    def __str__(self):
        return f"{self.provider}:{self.provider_uid} user:{self.user_id}"
