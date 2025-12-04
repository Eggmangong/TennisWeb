from django.db import models
from django.contrib.auth.models import User


# Extend User with a one-to-one Profile model to store extra fields
class Profile(models.Model):
	GENDER_CHOICES = (
		("M", "Male"),
		("F", "Female"),
		("O", "Other"),
	)

	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
	avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
	bio = models.TextField(blank=True, default="")
	# Approximate NTRP or custom rating like 3.0, 4.5 etc
	skill_level = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
	location = models.CharField(max_length=128, blank=True, default="")
	gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, default="O")
	# Extended tennis-related fields
	display_name = models.CharField(max_length=100, blank=True, default="")
	age = models.PositiveSmallIntegerField(null=True, blank=True)
	years_playing = models.PositiveSmallIntegerField(null=True, blank=True)
	DOMINANT_HAND_CHOICES = (
		("R", "Right"),
		("L", "Left"),
	)
	dominant_hand = models.CharField(max_length=1, choices=DOMINANT_HAND_CHOICES, blank=True, default="R")
	BACKHAND_CHOICES = (
		("1H", "One-handed"),
		("2H", "Two-handed"),
	)
	backhand_type = models.CharField(max_length=2, choices=BACKHAND_CHOICES, blank=True, default="2H")

	# Multi-select preferences stored as JSON arrays of codes
	preferred_court_types = models.JSONField(default=list, blank=True)  # values: ['hard','clay','grass']
	preferred_match_types = models.JSONField(default=list, blank=True)  # values: ['singles','doubles']
	play_intentions = models.JSONField(default=list, blank=True)        # values: ['casual','competitive']
	preferred_languages = models.JSONField(default=list, blank=True)    # values: ['en','zh']

	def __str__(self):
		return f"Profile({self.user.username})"


# Record daily tennis check-ins per user
class CheckIn(models.Model):
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="checkins")
	date = models.DateField()
	start_time = models.TimeField(null=True, blank=True)
	end_time = models.TimeField(null=True, blank=True)
	duration_minutes = models.PositiveIntegerField(default=0)  # Duration in minutes
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('user', 'date')


	class Meta:
		unique_together = ("user", "date")
		ordering = ["-date"]

	def __str__(self):
		return f"CheckIn(user={self.user.username}, date={self.date})"


# Simple friend relationship (unidirectional: user -> friend)
class Friend(models.Model):
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="friends")
	friend = models.ForeignKey(User, on_delete=models.CASCADE, related_name="friended_by")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ("user", "friend")
		ordering = ["-created_at"]

	def __str__(self):
		return f"Friend(user={self.user.username}, friend={self.friend.username})"


class ChatThread(models.Model):
	"""
	A chat thread between exactly two users.
	We normalize user1_id < user2_id to enforce uniqueness.
	"""
	user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_threads_as_user1")
	user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_threads_as_user2")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ("user1", "user2")
		ordering = ["-created_at"]

	def save(self, *args, **kwargs):
		# Ensure user1_id < user2_id for uniqueness
		if self.user1_id and self.user2_id and self.user1_id > self.user2_id:
			self.user1, self.user2 = self.user2, self.user1
		super().save(*args, **kwargs)

	def __str__(self):
		return f"ChatThread({self.user1.username}, {self.user2.username})"


class ChatMessage(models.Model):
	thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name="messages")
	sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
	content = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["created_at"]

	def __str__(self):
		return f"Msg(t={self.thread_id}, from={self.sender.username})"
