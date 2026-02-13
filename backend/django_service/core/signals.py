from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=UserProfile)
def sync_staff_flag_with_role(sender, instance, **kwargs):
    """
    Users with platform role=admin get Django staff access automatically,
    so they can manage registered accounts via /admin.
    """
    user = instance.user
    if user.is_superuser:
        return

    should_be_staff = instance.role == UserProfile.ROLE_ADMIN
    if user.is_staff != should_be_staff:
        user.is_staff = should_be_staff
        user.save(update_fields=["is_staff"])
