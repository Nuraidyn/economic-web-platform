import django.db.models.deletion
import uuid

from django.conf import settings
from django.db import migrations, models


def backfill_email_verified(apps, schema_editor):
    """Existing users are treated as verified — they registered before this feature."""
    UserProfile = apps.get_model("core", "UserProfile")
    UserProfile.objects.all().update(is_email_verified=True)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0003_backfill_profiles_and_admin_staff"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="is_email_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_email_verified, migrations.RunPython.noop),
        migrations.CreateModel(
            name="EmailVerificationToken",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("token", models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="verification_tokens",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
