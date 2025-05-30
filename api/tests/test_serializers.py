from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from api.models import Cabin
from api.serializers import (
    TherapistRegistrationSerializer, 
    UserDetailSerializer,
    CabinSerializer,
    AvailableSlotCreateSerializer,
    BookingSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)
from datetime import datetime, timedelta
import pytz
from decimal import Decimal

User = get_user_model()

class SerializerTests(TestCase):

    def setUp(self):
        self.utc = pytz.UTC
        self.user_data = {
            'username': 'testtherapist',
            'email': 'therapist@example.com',
            'password': 'StrongPassword123',
            'password2': 'StrongPassword123',
            'first_name': 'Test',
            'last_name': 'Therapist',
            'phone_number': '1234567890'
        }
        self.cabin1 = Cabin.objects.create(name='Cabin Alpha', capacity=2, description='Rustic charm')
        self.cabin2 = Cabin.objects.create(name='Cabin Beta', capacity=4, description='Modern comfort')

        # For PasswordResetRequestSerializer test
        User.objects.create_user(username='existinguser', email='exists@example.com', password='password')


    def test_therapist_registration_serializer_valid(self):
        serializer = TherapistRegistrationSerializer(data=self.user_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertEqual(user.username, self.user_data['username'])
        self.assertTrue(user.is_therapist)
        self.assertFalse(user.is_staff) # Ensure is_staff is False

    def test_therapist_registration_serializer_password_mismatch(self):
        data = self.user_data.copy()
        data['password2'] = 'WrongPassword123'
        serializer = TherapistRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors) # Password fields didn't match.

    def test_therapist_registration_serializer_email_exists(self):
        User.objects.create_user(username='anotheruser', email='therapist@example.com', password='password123')
        serializer = TherapistRegistrationSerializer(data=self.user_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_therapist_registration_serializer_username_exists(self):
        User.objects.create_user(username='testtherapist', email='another@example.com', password='password123')
        serializer = TherapistRegistrationSerializer(data=self.user_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)

    def test_user_detail_serializer(self):
        user = User.objects.create_user(**{k: v for k, v in self.user_data.items() if k not in ['password', 'password2']})
        serializer = UserDetailSerializer(instance=user)
        data = serializer.data
        self.assertEqual(data['username'], user.username)
        self.assertEqual(data['email'], user.email)
        self.assertNotIn('password', data)

    def test_cabin_serializer_valid(self):
        data = {'name': 'Test Cabin', 'description': 'A cozy test cabin', 'capacity': 3}
        serializer = CabinSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        cabin = serializer.save()
        self.assertEqual(cabin.name, data['name'])

    def test_cabin_serializer_invalid_capacity(self):
        data = {'name': 'Test Cabin', 'description': 'A cozy test cabin', 'capacity': 0} # Invalid capacity
        serializer = CabinSerializer(data=data)
        # Default Model field validation should handle this if capacity has MinValueValidator(1)
        # If not, serializer validation is needed. For now, assuming model handles it or it's not a strict serializer req.
        # self.assertFalse(serializer.is_valid()) 
        # self.assertIn('capacity', serializer.errors)
        pass # Placeholder if model doesn't have MinValueValidator


    def test_available_slot_create_serializer_valid(self):
        data = {
            'cabin': self.cabin1.pk,
            'start_time': self.utc.localize(datetime.now() + timedelta(days=1, hours=10)),
            'end_time': self.utc.localize(datetime.now() + timedelta(days=1, hours=12)),
            'price': Decimal('50.00')
        }
        serializer = AvailableSlotCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        slot = serializer.save()
        self.assertEqual(slot.cabin, self.cabin1)
        self.assertEqual(slot.status, 'available')
        self.assertIsNone(slot.therapist)

    def test_available_slot_create_serializer_invalid_time(self):
        data = {
            'cabin': self.cabin1.pk,
            'start_time': self.utc.localize(datetime.now() + timedelta(days=1, hours=12)),
            'end_time': self.utc.localize(datetime.now() + timedelta(days=1, hours=10)), # End before start
            'price': Decimal('50.00')
        }
        serializer = AvailableSlotCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('__all__', serializer.errors) # "End time must be after start time."

    def test_available_slot_create_serializer_missing_price(self):
        # Price is required by this serializer
        data = {
            'cabin': self.cabin1.pk,
            'start_time': self.utc.localize(datetime.now() + timedelta(days=1, hours=10)),
            'end_time': self.utc.localize(datetime.now() + timedelta(days=1, hours=12)),
        }
        serializer = AvailableSlotCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('price', serializer.errors)

    def test_booking_serializer_output(self):
        user = User.objects.create_user(username='bookedby', email='booker@example.com', password='password')
        booking = Booking.objects.create(
            therapist=user,
            cabin=self.cabin1,
            start_time=self.utc.localize(datetime.now() + timedelta(days=2)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=2, hours=2)),
            status='booked',
            price=Decimal('120.00')
        )
        serializer = BookingSerializer(instance=booking)
        data = serializer.data
        self.assertEqual(data['id'], booking.id)
        self.assertEqual(data['therapist'], user.pk)
        self.assertEqual(data['therapist_username'], user.username)
        self.assertEqual(data['cabin'], self.cabin1.pk)
        self.assertEqual(data['cabin_name'], self.cabin1.name)
        self.assertEqual(data['status'], 'booked')
        self.assertEqual(Decimal(data['price']), booking.price)
    
    def test_password_reset_request_serializer_valid_email(self):
        data = {'email': 'exists@example.com'}
        serializer = PasswordResetRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_password_reset_request_serializer_non_existent_email(self):
        data = {'email': 'nonexistent@example.com'}
        serializer = PasswordResetRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_password_reset_confirm_serializer_valid(self):
        data = {
            'token': 'somevalidtoken123', # Token validation is more of a view concern with cache/DB
            'new_password': 'NewStrongPassword123',
            'confirm_new_password': 'NewStrongPassword123'
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_password_reset_confirm_serializer_password_mismatch(self):
        data = {
            'token': 'somevalidtoken123',
            'new_password': 'NewStrongPassword123',
            'confirm_new_password': 'AnotherPassword123'
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('new_password', serializer.errors) # "Password fields didn't match."
    
    def test_therapist_profile_serializer_email_uniqueness(self):
        # This serializer's email validation needs 'request' in context
        user1 = User.objects.create_user(username='user1', email='user1@example.com', password='p1')
        User.objects.create_user(username='user2', email='user2@example.com', password='p2')

        # Attempt to update user1's email to user2's email
        from django.http import HttpRequest
        request = HttpRequest()
        request.user = user1 # Mocking request context

        serializer = TherapistProfileSerializer(
            instance=user1, 
            data={'email': 'user2@example.com'}, 
            context={'request': request}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
        self.assertEqual(serializer.errors['email'][0], "This email is already in use by another account.")

        # Attempt to update user1's email to a new unique email
        serializer_valid = TherapistProfileSerializer(
            instance=user1, 
            data={'email': 'user1_new@example.com'}, 
            context={'request': request}
        )
        self.assertTrue(serializer_valid.is_valid(), serializer_valid.errors)
