from django.db import models


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

    def __str__(self):
        return f"{self.user_id}:{self.role}"
