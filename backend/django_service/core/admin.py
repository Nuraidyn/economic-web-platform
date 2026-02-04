from django.contrib import admin

from .models import AgreementAcceptance, AnalysisPreset, UserAgreement, UserProfile


@admin.register(UserAgreement)
class UserAgreementAdmin(admin.ModelAdmin):
    list_display = ("title", "version", "is_active", "published_at")
    list_filter = ("is_active",)
    search_fields = ("title", "version")


@admin.register(AgreementAcceptance)
class AgreementAcceptanceAdmin(admin.ModelAdmin):
    list_display = ("user", "agreement", "accepted_at", "ip_address")
    list_filter = ("agreement",)
    search_fields = ("user__username", "user__email")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    list_filter = ("role",)
    search_fields = ("user__username", "user__email")


@admin.register(AnalysisPreset)
class AnalysisPresetAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "updated_at", "created_at")
    list_filter = ("updated_at",)
    search_fields = ("name", "user__username", "user__email")
