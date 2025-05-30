from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    is_therapist = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20)

    def __str__(self):
        return self.username

class Cabin(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    capacity = models.IntegerField(default=1)

    def __str__(self):
        return self.name

class Booking(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('booked', 'Booked'),
        ('cancelled', 'Cancelled'),
    ]
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings', null=True, blank=True) # Allow null and blank
    cabin = models.ForeignKey(Cabin, on_delete=models.CASCADE, related_name='bookings')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True) # Reverted to nullable for now

    def __str__(self):
        if self.therapist:
            return f"{self.therapist.username} - {self.cabin.name} ({self.start_time} - {self.end_time})"
        return f"Available Slot - {self.cabin.name} ({self.start_time} - {self.end_time})"
