from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from tennisweb_backend.api.models import Profile
import random


CITIES = [
    "San Francisco", "New York", "Los Angeles", "Seattle", "Austin",
    "Chicago", "Boston", "Miami", "Atlanta", "Denver",
]
DISPLAY_NAMES = [
    "Alex", "Sam", "Taylor", "Jordan", "Casey", "Riley", "Jamie", "Drew", "Reese", "Cameron",
]
COURT_TYPES = ["hard", "clay", "grass"]
MATCH_TYPES = ["singles", "doubles"]
PLAY_INTENTIONS = ["casual", "competitive"]
LANGUAGES = ["en", "zh"]
DOMINANT_HAND = ["R", "L"]
BACKHAND_TYPES = ["1H", "2H"]


def rand_subset(options, min_n=1, max_n=None):
    if max_n is None:
        max_n = len(options)
    n = random.randint(min_n, max_n)
    return random.sample(options, n)


class Command(BaseCommand):
    help = "Seed the database with fake users and profiles"

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=1000, help="Number of users to create")
        parser.add_argument("--prefix", type=str, default="seed_user_", help="Username prefix")

    def handle(self, *args, **options):
        count = options["count"]
        prefix = options["prefix"]
        created = 0
        for i in range(1, count + 1):
            username = f"{prefix}{i:04d}"
            if User.objects.filter(username=username).exists():
                continue
            email = f"{username}@example.com"
            user = User.objects.create_user(username=username, email=email, password="test1234")
            # Profile fields
            display_name = random.choice(DISPLAY_NAMES) + f" {i}"
            skill_level = random.choice([x / 10.0 for x in range(10, 56, 5)])  # 1.0 - 5.5 step 0.5
            location = random.choice(CITIES)
            gender = random.choice(["M", "F", "O"])
            age = random.randint(16, 65)
            years_playing = max(0, age - random.randint(12, 30))
            dominant_hand = random.choice(DOMINANT_HAND)
            backhand_type = random.choice(BACKHAND_TYPES)
            preferred_court_types = rand_subset(COURT_TYPES, 1, 2)
            preferred_match_types = rand_subset(MATCH_TYPES, 1, 2)
            play_intentions = rand_subset(PLAY_INTENTIONS, 1, 2)
            preferred_languages = rand_subset(LANGUAGES, 1, 2)

            Profile.objects.create(
                user=user,
                bio="",
                skill_level=skill_level,
                location=location,
                gender=gender,
                display_name=display_name,
                age=age,
                years_playing=years_playing,
                dominant_hand=dominant_hand,
                backhand_type=backhand_type,
                preferred_court_types=preferred_court_types,
                preferred_match_types=preferred_match_types,
                play_intentions=play_intentions,
                preferred_languages=preferred_languages,
            )
            created += 1
            if created % 50 == 0:
                self.stdout.write(self.style.SUCCESS(f"Created {created} users..."))

        self.stdout.write(self.style.SUCCESS(f"Seeding complete. Created {created} new users."))
