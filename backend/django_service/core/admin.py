from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import AgreementAcceptance, AnalysisPreset, UserAgreement, UserProfile
from .utils import has_accepted_active_agreement

User = get_user_model()


def is_platform_admin(request):
    if not request.user or not request.user.is_authenticated:
        return False
    profile = getattr(request.user, "profile", None)
    return bool(request.user.is_staff and profile and profile.role == UserProfile.ROLE_ADMIN)


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    verbose_name_plural = "Platform profile"
    fields = ("role",)

    def has_view_permission(self, request, obj=None):
        return super().has_view_permission(request, obj) or is_platform_admin(request)

    def has_change_permission(self, request, obj=None):
        return super().has_change_permission(request, obj) or is_platform_admin(request)

    def has_add_permission(self, request, obj=None):
        return super().has_add_permission(request, obj) or is_platform_admin(request)


@admin.action(description="Promote selected users to researcher")
def make_researcher(modeladmin, request, queryset):
    for user in queryset:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = UserProfile.ROLE_RESEARCHER
        profile.save(update_fields=["role"])


@admin.action(description="Promote selected users to platform admin")
def make_platform_admin(modeladmin, request, queryset):
    for user in queryset:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = UserProfile.ROLE_ADMIN
        profile.save(update_fields=["role"])


@admin.action(description="Demote selected users to registered user")
def make_registered_user(modeladmin, request, queryset):
    for user in queryset:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = UserProfile.ROLE_USER
        profile.save(update_fields=["role"])


class UserAdmin(DjangoUserAdmin):
    inlines = (UserProfileInline,)
    actions = (
        make_researcher,
        make_platform_admin,
        make_registered_user,
    )
    list_display = (
        "username",
        "email",
        "platform_role",
        "agreement_status",
        "is_active",
        "is_staff",
        "is_superuser",
        "last_login",
        "date_joined",
    )
    list_filter = DjangoUserAdmin.list_filter + ("profile__role",)
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("-date_joined",)
    readonly_fields = ("last_login", "date_joined")

    @admin.display(description="Role")
    def platform_role(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.role if profile else UserProfile.ROLE_USER

    @admin.display(description="Agreement accepted", boolean=True)
    def agreement_status(self, obj):
        return has_accepted_active_agreement(obj)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related("profile")

    def has_module_permission(self, request):
        return super().has_module_permission(request) or is_platform_admin(request)

    def has_view_permission(self, request, obj=None):
        if super().has_view_permission(request, obj):
            return True
        if not is_platform_admin(request):
            return False
        if obj and obj.is_superuser and not request.user.is_superuser:
            return False
        return True

    def has_add_permission(self, request):
        return super().has_add_permission(request) or is_platform_admin(request)

    def has_change_permission(self, request, obj=None):
        if super().has_change_permission(request, obj):
            return True
        if not is_platform_admin(request):
            return False
        if obj and obj.is_superuser and not request.user.is_superuser:
            return False
        return True

    def has_delete_permission(self, request, obj=None):
        if super().has_delete_permission(request, obj):
            return True
        if not is_platform_admin(request):
            return False
        if obj and obj.is_superuser:
            return False
        return True

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if request.user.is_superuser:
            return tuple(readonly)
        if is_platform_admin(request):
            readonly.extend(("is_superuser", "groups", "user_permissions", "is_staff"))
        return tuple(dict.fromkeys(readonly))


try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass

admin.site.register(User, UserAdmin)


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

    def has_module_permission(self, request):
        return super().has_module_permission(request) or is_platform_admin(request)

    def has_view_permission(self, request, obj=None):
        return super().has_view_permission(request, obj) or is_platform_admin(request)

    def has_change_permission(self, request, obj=None):
        return super().has_change_permission(request, obj) or is_platform_admin(request)


@admin.register(AnalysisPreset)
class AnalysisPresetAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "updated_at", "created_at")
    list_filter = ("updated_at",)
    search_fields = ("name", "user__username", "user__email")
