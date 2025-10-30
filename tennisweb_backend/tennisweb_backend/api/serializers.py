from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile


class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "profile"]

    def get_profile(self, obj):
        try:
            # Propagate serializer context so ProfileSerializer can build absolute avatar_url via request
            return ProfileSerializer(obj.profile, context=self.context).data
        except Profile.DoesNotExist:
            return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        # Create an empty profile for the new user
        Profile.objects.create(user=user)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "avatar_url",
            "bio",
            "skill_level",
            "location",
            "gender",
            "display_name",
            "age",
            "years_playing",
            "dominant_hand",
            "backhand_type",
        ]

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar and hasattr(obj.avatar, "url"):
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "bio",
            "skill_level",
            "location",
            "gender",
            "avatar",
            "display_name",
            "age",
            "years_playing",
            "dominant_hand",
            "backhand_type",
        ]
        extra_kwargs = {"avatar": {"required": False}}
