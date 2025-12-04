from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.db import models
from datetime import date as dt_date
from calendar import monthrange
from math import exp
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ProfileUpdateSerializer,
    CheckInSerializer,
    UserBriefSerializer,
    FriendSerializer,
    RecommendationSerializer,
    ChatThreadSerializer,
    ChatMessageSerializer,
)
from .models import Profile, CheckIn, Friend, ChatThread, ChatMessage
import re
import unicodedata


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class ProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfileUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, *args, **kwargs):
        user = request.user
        profile, _ = Profile.objects.get_or_create(user=user)
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, *args, **kwargs):
        return self.put(request, *args, **kwargs)


class CheckInMonthView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Query params:
        - month: "YYYY-MM" (defaults to current month)
        Returns { checkins: [{ date: "YYYY-MM-DD", duration: 120 }, ...] } for given month.
        """
        month_str = request.query_params.get("month")
        today = dt_date.today()
        try:
            if month_str:
                year_s, month_s = month_str.split("-")
                year, month = int(year_s), int(month_s)
            else:
                year, month = today.year, today.month
        except Exception:
            return Response({"detail": "Invalid month format, expected YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)

        first_day = dt_date(year, month, 1)
        last_day = dt_date(year, month, monthrange(year, month)[1])
        qs = CheckIn.objects.filter(user=request.user, date__gte=first_day, date__lte=last_day)
        
        # Return list of objects with date and duration
        data = [{
            "date": c.date.isoformat(),
            "duration": c.duration_minutes,
            "start_time": c.start_time.strftime("%H:%M") if c.start_time else None,
            "end_time": c.end_time.strftime("%H:%M") if c.end_time else None
        } for c in qs]
        return Response({"checkins": data})


class CheckInSetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Body: { "date": "YYYY-MM-DD", "value": true|false, "duration": int (optional), "start_time": "HH:MM", "end_time": "HH:MM" }
        If value=true, create/update check-in for that date. If value=false, delete if exists.
        """
        # Build a clean payload mapping client fields to serializer fields to avoid unknown-field errors
        clean_payload = {
            "date": request.data.get("date"),
        }
        if "start_time" in request.data:
            clean_payload["start_time"] = request.data.get("start_time")  # may be null
        if "end_time" in request.data:
            clean_payload["end_time"] = request.data.get("end_time")  # may be null
        if "duration" in request.data:
            clean_payload["duration_minutes"] = request.data.get("duration")

        serializer = CheckInSerializer(data=clean_payload)
        value = request.data.get("value")

        if value is None:
            return Response({"detail": "Missing 'value' boolean"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            val_bool = bool(value) if isinstance(value, bool) else str(value).lower() in ("1", "true", "yes")
        except Exception:
            return Response({"detail": "Invalid 'value'"}, status=status.HTTP_400_BAD_REQUEST)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        check_date = serializer.validated_data["date"]
        if val_bool:
            obj, created = CheckIn.objects.get_or_create(user=request.user, date=check_date)
            
            # Update fields from validated data (types are parsed; allow setting to None)
            if "start_time" in clean_payload:
                obj.start_time = serializer.validated_data.get("start_time")
            if "end_time" in clean_payload:
                obj.end_time = serializer.validated_data.get("end_time")
            
            # Auto-calculate duration if start/end provided
            if obj.start_time and obj.end_time:
                # Simple calculation assuming same day
                from datetime import datetime, date
                dummy_date = date(2000, 1, 1)
                dt_start = datetime.combine(dummy_date, obj.start_time)
                dt_end = datetime.combine(dummy_date, obj.end_time)
                if dt_end > dt_start:
                    diff = dt_end - dt_start
                    obj.duration_minutes = int(diff.total_seconds() / 60)
                else:
                    # Handle overnight or error? For now assume user input is correct or 0
                    pass
            elif "duration_minutes" in serializer.validated_data and serializer.validated_data.get("duration_minutes") is not None:
                try:
                    obj.duration_minutes = int(serializer.validated_data.get("duration_minutes") or 0)
                except (TypeError, ValueError):
                    obj.duration_minutes = 0
            
            obj.save()
            
            return Response({
                "ok": True, 
                "date": check_date.isoformat(), 
                "value": True, 
                "duration": obj.duration_minutes,
                "start_time": obj.start_time.strftime("%H:%M") if obj.start_time else None,
                "end_time": obj.end_time.strftime("%H:%M") if obj.end_time else None
            })
        else:
            CheckIn.objects.filter(user=request.user, date=check_date).delete()
            return Response({"ok": True, "date": check_date.isoformat(), "value": False})


def _overlap_count(a, b):
    if not a or not b:
        return 0
    return len(set(a) & set(b))


def compute_match_score(p1: Profile, p2: Profile) -> float:
    score = 0.0
    # Overlaps
    score += 2.0 * _overlap_count(p1.preferred_court_types, p2.preferred_court_types)
    score += 2.0 * _overlap_count(p1.preferred_match_types, p2.preferred_match_types)
    score += 1.5 * _overlap_count(p1.play_intentions, p2.play_intentions)
    score += 1.0 * _overlap_count(p1.preferred_languages, p2.preferred_languages)
    # Skill level proximity
    if p1.skill_level is not None and p2.skill_level is not None:
        try:
            diff = abs(float(p1.skill_level) - float(p2.skill_level))
            score += 3.0 * exp(-0.8 * diff)
        except Exception:
            pass
    # Age proximity
    if p1.age is not None and p2.age is not None:
        try:
            adiff = abs(int(p1.age) - int(p2.age))
            score += 1.5 * exp(-0.05 * adiff)
        except Exception:
            pass
    # Location robust match (normalize, alias, and fuzzy compare)
    def _normalize_loc(loc: str):

        if not loc:
            return set()

        s = unicodedata.normalize("NFKD", str(loc)).encode("ascii", "ignore").decode("ascii").lower()
        s = s.replace(".", " ")
        s = re.sub(r"[,\-_/\\|;:]+", " ", s)
        s = re.sub(r"\s+", " ", s).strip()

        # Expand common abbreviations/nicknames to canonical phrases
        phrase_aliases = {
            "la": "los angeles",
            "l a": "los angeles",
            "nyc": "new york",
            "sf": "san francisco",
            "sfo": "san francisco",
            "sj": "san jose",
            "sd": "san diego",
            "dfw": "dallas fort worth",
            "bay area": "san francisco bay",
        }
        for k, v in phrase_aliases.items():
            s = re.sub(rf"\b{k}\b", v, s)

        # Handle glued words like "losangeles", "newyork"
        s = re.sub(r"\blosangeles\b", "los angeles", s)
        s = re.sub(r"\bnewyork\b", "new york", s)
        s = re.sub(r"\bsanfrancisco\b", "san francisco", s)
        s = re.sub(r"\bsanjose\b", "san jose", s)
        s = re.sub(r"\bsandiego\b", "san diego", s)

        tokens = [t for t in s.split(" ") if t]

        # Remove generic geography/country noise
        stop = {
            "usa", "us", "united", "states", "america", "u", "s",
            "uk", "cn", "prc", "people", "republic",
            "the", "of", "and",
            "city", "county", "province", "state", "region", "district",
            "prefecture", "municipality", "metro", "area", "greater", "metropolitan",
        }
        # US state abbreviations (keep 'la' for Los Angeles handling above)
        state_abbr = {
            "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id",
            "il", "in", "ia", "ks", "ky", "me", "md", "ma", "mi", "mn", "ms", "mo",
            "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok", "or",
            "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy", "dc"
        }

        cleaned = []
        for t in tokens:
            if t in stop:
                continue
            if t in state_abbr:
                continue
            cleaned.append(t)

        return set(cleaned)

    def _location_similarity(a: str, b: str) -> float:
        A = _normalize_loc(a)
        B = _normalize_loc(b)
        if not A or not B:
            return 0.0
        inter = len(A & B)
        union = len(A | B)
        return inter / union if union else 0.0

    if p1.location and p2.location:
        sim = _location_similarity(p1.location, p2.location)
        # Strong match if near-identical tokens (e.g., "Los Angeles, CA, USA" vs "Los Angeles/LA")
        if sim >= 0.8:
            score += 2.0
        # Partial match (e.g., same city but extra geo qualifiers differ)
        elif sim >= 0.5:
            score += 1.0

    return score


class RecommendMatchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            p1 = user.profile
        except Profile.DoesNotExist:
            return Response({"detail": "Profile not found for current user"}, status=status.HTTP_400_BAD_REQUEST)

        # Exclusions: self, already friends, and optional query param 'exclude'
        excluded_ids = set([user.id])
        friend_ids = set(Friend.objects.filter(user=user).values_list("friend_id", flat=True))
        excluded_ids.update(friend_ids)
        extra_exclude = request.query_params.get("exclude")
        if extra_exclude:
            try:
                excluded_ids.update(int(x) for x in extra_exclude.split(",") if x.strip())
            except Exception:
                pass

        candidates = User.objects.exclude(id__in=excluded_ids)
        best = None
        best_score = -1.0
        for u in candidates:
            try:
                p2 = u.profile
            except Profile.DoesNotExist:
                continue
            s = compute_match_score(p1, p2)
            if s > best_score:
                best_score = s
                best = u

        if not best:
            return Response({"detail": "No candidates available"}, status=status.HTTP_404_NOT_FOUND)

        data = RecommendationSerializer({"user": best, "score": best_score}, context={"request": request}).data
        return Response(data)


class MatchCandidatesView(APIView):
    """Return a batch of candidate users with algorithm scores for AI matching.

    The AI layer can call this to build a prompt. We intentionally cap the number
    to keep prompt token size manageable. Candidates are sorted by algorithmic score
    (descending) and truncated.
    Query params:
      - exclude: comma-separated user IDs to exclude (same logic as RecommendMatchView)
      - limit: optional max number (default 8, max 25)
    Response shape:
      { "candidates": [ {"user": <UserSerializer>, "score": float } ] }
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            p1 = user.profile
        except Profile.DoesNotExist:
            return Response({"detail": "Profile not found for current user"}, status=status.HTTP_400_BAD_REQUEST)

        excluded_ids = set([user.id])
        friend_ids = set(Friend.objects.filter(user=user).values_list("friend_id", flat=True))
        excluded_ids.update(friend_ids)
        extra_exclude = request.query_params.get("exclude")
        if extra_exclude:
            try:
                excluded_ids.update(int(x) for x in extra_exclude.split(",") if x.strip())
            except Exception:
                pass

        limit_raw = request.query_params.get("limit")
        try:
            limit = int(limit_raw) if limit_raw else 8
        except ValueError:
            limit = 8
        if limit < 1:
            limit = 1
        if limit > 25:
            limit = 25

        candidates_qs = User.objects.exclude(id__in=excluded_ids)
        scored = []
        for u in candidates_qs:
            try:
                p2 = u.profile
            except Profile.DoesNotExist:
                continue
            s = compute_match_score(p1, p2)
            scored.append((u, s))
        # Sort by score descending then truncate
        scored.sort(key=lambda x: x[1], reverse=True)
        scored = scored[:limit]

        out = [RecommendationSerializer({"user": u, "score": s}, context={"request": request}).data for (u, s) in scored]
        return Response({"candidates": out})


class FriendListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Friend.objects.filter(user=request.user).select_related("friend", "friend__profile")
        ser = FriendSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)

    def post(self, request):
        ser = FriendSerializer(data=request.data, context={"request": request})
        if ser.is_valid():
            friend_user: User = ser.validated_data["friend"]
            if friend_user.id == request.user.id:
                return Response({"detail": "Cannot add yourself as friend"}, status=status.HTTP_400_BAD_REQUEST)
            obj, _created = Friend.objects.get_or_create(user=request.user, friend=friend_user)
            out = FriendSerializer(obj, context={"request": request}).data
            return Response(out, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


class FriendDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, friend_id: int):
        Friend.objects.filter(user=request.user, friend_id=friend_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id: int):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        data = UserSerializer(user, context={"request": request}).data
        return Response(data)


def _get_or_create_thread(current_user: User, other_user: User) -> ChatThread:
    # Normalize order
    u1, u2 = (current_user, other_user) if current_user.id < other_user.id else (other_user, current_user)
    thread, _ = ChatThread.objects.get_or_create(user1=u1, user2=u2)
    return thread


class ChatThreadListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = ChatThread.objects.filter(models.Q(user1=request.user) | models.Q(user2=request.user)).select_related("user1", "user2")
        ser = ChatThreadSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)

    def post(self, request):
        other_user_id = request.data.get("other_user_id")
        try:
            other = User.objects.get(id=int(other_user_id))
        except Exception:
            return Response({"detail": "Invalid other_user_id"}, status=status.HTTP_400_BAD_REQUEST)
        if other.id == request.user.id:
            return Response({"detail": "Cannot start chat with yourself"}, status=status.HTTP_400_BAD_REQUEST)
        thread = _get_or_create_thread(request.user, other)
        data = ChatThreadSerializer(thread, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)


class ChatThreadMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, thread_id: int):
        try:
            thread = ChatThread.objects.select_related("user1", "user2").get(id=thread_id)
        except ChatThread.DoesNotExist:
            return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)
        if request.user.id not in (thread.user1_id, thread.user2_id):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        since = request.query_params.get("since")
        qs = ChatMessage.objects.filter(thread=thread)
        if since:
            try:
                from django.utils.dateparse import parse_datetime
                dt = parse_datetime(since)
                if dt is not None:
                    qs = qs.filter(created_at__gt=dt)
            except Exception:
                pass
        ser = ChatMessageSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)

    def post(self, request, thread_id: int):
        try:
            thread = ChatThread.objects.get(id=thread_id)
        except ChatThread.DoesNotExist:
            return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)
        if request.user.id not in (thread.user1_id, thread.user2_id):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        content = request.data.get("content", "").strip()
        if not content:
            return Response({"detail": "Message content required"}, status=status.HTTP_400_BAD_REQUEST)
        msg = ChatMessage.objects.create(thread=thread, sender=request.user, content=content)
        data = ChatMessageSerializer(msg, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)

