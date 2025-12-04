from django.urls import path
from .views import (
    RegisterView,
    ProfileView,
    ProfileUpdateView,
    CheckInMonthView,
    CheckInSetView,
    RecommendMatchView,
    MatchCandidatesView,
    FriendListCreateView,
    FriendDeleteView,
    UserDetailView,
    ChatThreadListCreateView,
    ChatThreadMessagesView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("profile/update/", ProfileUpdateView.as_view(), name="profile_update"),
    # Calendar check-ins
    path("checkins/", CheckInMonthView.as_view(), name="checkins_month"),
    path("checkins/set/", CheckInSetView.as_view(), name="checkins_set"),
    # Matching and friends
    path("match/recommend/", RecommendMatchView.as_view(), name="match_recommend"),
    path("match/candidates/", MatchCandidatesView.as_view(), name="match_candidates"),
    path("friends/", FriendListCreateView.as_view(), name="friends_list_create"),
    path("friends/<int:friend_id>/", FriendDeleteView.as_view(), name="friends_delete"),
    path("users/<int:user_id>/", UserDetailView.as_view(), name="user_detail"),
    # Chat
    path("chat/threads/", ChatThreadListCreateView.as_view(), name="chat_threads"),
    path("chat/threads/<int:thread_id>/messages/", ChatThreadMessagesView.as_view(), name="chat_thread_messages"),
]
