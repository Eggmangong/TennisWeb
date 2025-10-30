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

	def __str__(self):
		return f"Profile({self.user.username})"
