from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from api.models import Cabin, Booking
from datetime import datetime, timedelta
import pytz
from decimal import Decimal
from unittest.mock import patch

User = get_user_model()

class TherapistViewTests(APITestCase):

    def setUp(self):
        self.utc = pytz.UTC
        self.therapist_user = User.objects.create_user(
            username='therapist1', email='therapist1@example.com', password='password123', 
            is_therapist=True, first_name='Thera', last_name='Pist'
        )
        self.other_therapist = User.objects.create_user(
            username='therapist2', email='therapist2@example.com', password='password123', is_therapist=True
        )
        self.admin_user = User.objects.create_user(
            username='admin', email='admin@example.com', password='password123', is_admin=True
        )
        self.regular_user = User.objects.create_user(
            username='regularuser', email='regular@example.com', password='password123'
        )

        self.cabin1 = Cabin.objects.create(name='Serene Cabin', capacity=1)
        self.cabin2 = Cabin.objects.create(name='Peaceful Place', capacity=2)

        # Available slot
        self.available_slot = Booking.objects.create(
            cabin=self.cabin1, 
            start_time=self.utc.localize(datetime.now() + timedelta(days=3, hours=10)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=3, hours=12)),
            price=Decimal('150.00'), status='available'
        )
        # Slot booked by self.therapist_user
        self.my_booking = Booking.objects.create(
            therapist=self.therapist_user, cabin=self.cabin2,
            start_time=self.utc.localize(datetime.now() + timedelta(days=5, hours=10)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=5, hours=12)),
            price=Decimal('200.00'), status='booked'
        )
        # Slot booked by other therapist
        self.other_booking = Booking.objects.create(
            therapist=self.other_therapist, cabin=self.cabin1,
            start_time=self.utc.localize(datetime.now() + timedelta(days=7, hours=10)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=7, hours=12)),
            price=Decimal('180.00'), status='booked'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.therapist_user)


    # Profile Management
    def test_get_therapist_profile_success(self):
        url = reverse('api:therapist_profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.therapist_user.username)
        self.assertEqual(response.data['email'], self.therapist_user.email)

    def test_get_therapist_profile_unauthenticated(self):
        self.client.logout()
        url = reverse('api:therapist_profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_therapist_profile_as_non_therapist(self):
        self.client.force_authenticate(user=self.regular_user)
        url = reverse('api:therapist_profile')
        response = self.client.get(url)
        # The view's get_object checks if user.is_therapist
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN) 

    def test_update_therapist_profile_success(self):
        url = reverse('api:therapist_profile')
        payload = {'first_name': 'UpdatedFirst', 'last_name': 'UpdatedLast', 'phone_number': '1112223333', 'email': 'therapist1_updated@example.com'}
        response = self.client.put(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.therapist_user.refresh_from_db()
        self.assertEqual(self.therapist_user.first_name, 'UpdatedFirst')
        self.assertEqual(self.therapist_user.email, 'therapist1_updated@example.com')

    # Available Slots
    def test_list_available_slots_success(self):
        url = reverse('api:therapist_slots_available')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should contain self.available_slot
        self.assertTrue(any(slot['id'] == self.available_slot.id for slot in response.data))
        # Should not contain booked slots
        self.assertFalse(any(slot['id'] == self.my_booking.id for slot in response.data))

    def test_list_available_slots_filter_cabin(self):
        url = reverse('api:therapist_slots_available') + f'?cabin_id={self.cabin1.id}'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for slot in response.data:
            self.assertEqual(slot['cabin'], self.cabin1.id)

    @patch('api.views.send_app_email')
    def test_book_slot_success(self, mock_send_email):
        url = reverse('api:therapist_slot_book', kwargs={'pk': self.available_slot.id})
        response = self.client.post(url, {}, format='json') # No payload needed for this action
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.available_slot.refresh_from_db()
        self.assertEqual(self.available_slot.status, 'booked')
        self.assertEqual(self.available_slot.therapist, self.therapist_user)
        self.assertEqual(mock_send_email.call_count, 2) # One for therapist, one for admin

    def test_book_slot_already_booked(self):
        # Make self.available_slot booked by another therapist
        self.available_slot.therapist = self.other_therapist
        self.available_slot.status = 'booked'
        self.available_slot.save()

        url = reverse('api:therapist_slot_book', kwargs={'pk': self.available_slot.id})
        response = self.client.post(url, {}, format='json')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_409_CONFLICT]) # Depends on exact error handling in view

    def test_book_non_existent_slot(self):
        url = reverse('api:therapist_slot_book', kwargs={'pk': 9999}) # Non-existent ID
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # My Bookings
    def test_list_my_bookings_success(self):
        url = reverse('api:therapist_bookings_mine')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(booking['id'] == self.my_booking.id for booking in response.data))
        self.assertFalse(any(booking['id'] == self.other_booking.id for booking in response.data)) # Should not see other's bookings

    def test_list_my_bookings_filter_status(self):
        url = reverse('api:therapist_bookings_mine') + '?status=booked'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for booking in response.data:
            self.assertEqual(booking['status'], 'booked')

    @patch('api.views.send_app_email')
    def test_cancel_my_booking_success(self, mock_send_email):
        url = reverse('api:therapist_booking_cancel', kwargs={'pk': self.my_booking.id})
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.my_booking.refresh_from_db()
        self.assertEqual(self.my_booking.status, 'cancelled')
        self.assertEqual(mock_send_email.call_count, 2) # Therapist and Admin

    def test_cancel_other_therapist_booking(self):
        url = reverse('api:therapist_booking_cancel', kwargs={'pk': self.other_booking.id})
        response = self.client.post(url, {}, format='json')
        # IsOwnerOrAdmin permission should deny this
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN) 
        self.other_booking.refresh_from_db()
        self.assertEqual(self.other_booking.status, 'booked') # Status should not change

    def test_cancel_already_cancelled_booking(self):
        self.my_booking.status = 'cancelled'
        self.my_booking.save()
        url = reverse('api:therapist_booking_cancel', kwargs={'pk': self.my_booking.id})
        response = self.client.post(url, {}, format='json')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT]) # Depends on view check
        self.my_booking.refresh_from_db()
        self.assertEqual(self.my_booking.status, 'cancelled') # Should remain cancelled
    
    def test_therapist_profile_view_as_admin(self):
        # Admin should not be able to access therapist-specific profile view
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('api:therapist_profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN) # Denied by IsTherapistUser check in get_object

    def tearDown(self):
        self.client.logout()
        super().tearDown()
