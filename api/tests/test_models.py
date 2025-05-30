from django.test import TestCase
from django.contrib.auth import get_user_model
from api.models import Cabin, Booking
from datetime import datetime, timedelta
import pytz # For timezone aware datetimes
from decimal import Decimal # Import Decimal

User = get_user_model()

class ModelTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', 
            email='test@example.com', 
            password='password123',
            first_name='Test',
            last_name='User',
            is_therapist=True
        )
        self.cabin = Cabin.objects.create(
            name='Forest Retreat', 
            description='A quiet cabin in the woods.', 
            capacity=2
        )
        self.utc = pytz.UTC
        self.booking_available = Booking.objects.create(
            cabin=self.cabin,
            start_time=self.utc.localize(datetime.now() + timedelta(days=1)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=1, hours=2)),
            status='available',
            price=Decimal('100.00')
        )
        self.booking_booked = Booking.objects.create(
            therapist=self.user,
            cabin=self.cabin,
            start_time=self.utc.localize(datetime.now() + timedelta(days=2)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=2, hours=2)),
            status='booked',
            price=Decimal('120.00')
        )

    def test_user_str(self):
        self.assertEqual(str(self.user), 'testuser')

    def test_cabin_str(self):
        self.assertEqual(str(self.cabin), 'Forest Retreat')

    def test_booking_str_available(self):
        expected_str = f"Available Slot - {self.cabin.name} ({self.booking_available.start_time} - {self.booking_available.end_time})"
        self.assertEqual(str(self.booking_available), expected_str)

    def test_booking_str_booked(self):
        expected_str = f"{self.user.username} - {self.cabin.name} ({self.booking_booked.start_time} - {self.booking_booked.end_time})"
        self.assertEqual(str(self.booking_booked), expected_str)

    def test_booking_default_status(self):
        new_booking = Booking.objects.create(
            cabin=self.cabin,
            start_time=self.utc.localize(datetime.now() + timedelta(days=3)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=3, hours=2)),
            price=Decimal('90.00')
        )
        self.assertEqual(new_booking.status, 'available')
    
    def test_user_creation_flags(self):
        therapist = User.objects.create_user(username='therapist1', is_therapist=True)
        admin = User.objects.create_user(username='admin1', is_admin=True)
        regular_user = User.objects.create_user(username='user1')

        self.assertTrue(therapist.is_therapist)
        self.assertFalse(therapist.is_admin)
        self.assertTrue(admin.is_admin)
        self.assertFalse(admin.is_therapist)
        self.assertFalse(regular_user.is_admin)
        self.assertFalse(regular_user.is_therapist)

    def test_booking_price_handling(self):
        # Price is DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
        booking_no_price = Booking.objects.create(
            cabin=self.cabin,
            start_time=self.utc.localize(datetime.now() + timedelta(days=4)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=4, hours=2)),
            status='available',
            price=None 
        )
        self.assertIsNone(booking_no_price.price)
        
        booking_with_price = Booking.objects.create(
            cabin=self.cabin,
            start_time=self.utc.localize(datetime.now() + timedelta(days=5)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=5, hours=2)),
            status='available',
            price=Decimal('75.50')
        )
        self.assertEqual(booking_with_price.price, Decimal('75.50'))
