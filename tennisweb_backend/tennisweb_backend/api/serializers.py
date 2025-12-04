from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile, CheckIn, Friend, ChatThread, ChatMessage


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
            "preferred_court_types",
            "preferred_match_types",
            "play_intentions",
            "preferred_languages",
        ]

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar and hasattr(obj.avatar, "url"):
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None


class BriefProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "avatar_url",
            "display_name",
            "skill_level",
            "location",
            "age",
            "preferred_court_types",
            "preferred_match_types",
            "play_intentions",
            "preferred_languages",
        ]

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar and hasattr(obj.avatar, "url"):
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None


class UserBriefSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "profile"]

    def get_profile(self, obj):
        try:
            return BriefProfileSerializer(obj.profile, context=self.context).data
        except Profile.DoesNotExist:
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
            "preferred_court_types",
            "preferred_match_types",
            "play_intentions",
            "preferred_languages",
        ]
        extra_kwargs = {"avatar": {"required": False}}

    def validate(self, attrs):
        # Coerce multi-select JSON fields from strings to lists if necessary and validate allowed values
        allowed = {
            "preferred_court_types": {"hard", "clay", "grass"},
            "preferred_match_types": {"singles", "doubles"},
            "play_intentions": {"casual", "competitive"},
            "preferred_languages": {"en", "zh"},
        }
        import json
        for key, choices in allowed.items():
            if key in self.initial_data:
                val = self.initial_data.get(key)
                parsed = None
                if isinstance(val, list):
                    parsed = val
                elif isinstance(val, str):
                    s = val.strip()
                    try:
                        parsed = json.loads(s) if s.startswith("[") else [p for p in [x.strip() for x in s.split(",") if x.strip()]]
                    except Exception:
                        parsed = [p for p in [x.strip() for x in s.split(",") if x.strip()]]
                if parsed is not None:
                    # filter unknowns
                    parsed = [x for x in parsed if x in choices]
                    attrs[key] = parsed
        return super().validate(attrs)


class CheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckIn
        fields = ["date", "duration_minutes", "start_time", "end_time"]


class FriendSerializer(serializers.ModelSerializer):
    friend = UserBriefSerializer(read_only=True)
    friend_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), write_only=True, source="friend"
    )

    class Meta:
        model = Friend
        fields = ["id", "friend", "friend_id", "created_at"]


class RecommendationSerializer(serializers.Serializer):
    user = UserSerializer()
    score = serializers.FloatField()


class ChatThreadSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = ["id", "other_user", "created_at"]

    def get_other_user(self, obj: ChatThread):
        request = self.context.get("request")
        current_user: User | None = getattr(request, "user", None)
        other = obj.user2 if current_user and obj.user1_id == current_user.id else obj.user1
        return UserBriefSerializer(other, context=self.context).data


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserBriefSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "sender", "content", "created_at"]

