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

class AdminViewTests(APITestCase):

    def setUp(self):
        self.utc = pytz.UTC
        self.admin_user = User.objects.create_user(
            username='adminuser', email='admin@example.com', password='password123', 
            is_admin=True, is_staff=True # is_staff for DRF IsAdminUser, is_admin for custom perm
        )
        self.therapist_user = User.objects.create_user(
            username='therapist', email='therapist@example.com', password='password123', is_therapist=True
        )
        self.regular_user = User.objects.create_user(
            username='user', email='user@example.com', password='password123'
        )

        self.cabin1 = Cabin.objects.create(name='Admin Cabin A', capacity=3, description='For admin tests')
        self.cabin2 = Cabin.objects.create(name='Admin Cabin B', capacity=1)

        self.available_slot_by_admin = Booking.objects.create(
            cabin=self.cabin1, 
            start_time=self.utc.localize(datetime.now() + timedelta(days=10, hours=9)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=10, hours=11)),
            price=Decimal('99.00'), status='available'
        )
        self.booked_slot = Booking.objects.create(
            therapist=self.therapist_user, cabin=self.cabin2,
            start_time=self.utc.localize(datetime.now() + timedelta(days=12, hours=14)),
            end_time=self.utc.localize(datetime.now() + timedelta(days=12, hours=16)),
            price=Decimal('130.00'), status='booked'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)

    # Cabin Management
    def test_admin_list_cabins(self):
        url = reverse('api:admin_cabin-list') # For ModelViewSet, router generates 'basename-list'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2) # cabin1 and cabin2

    def test_admin_create_cabin_success(self):
        url = reverse('api:admin_cabin-list')
        payload = {'name': 'New Admin Cabin', 'description': 'Brand new', 'capacity': 4}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Cabin.objects.filter(name='New Admin Cabin').exists())

    def test_admin_create_cabin_invalid_payload(self):
        url = reverse('api:admin_cabin-list')
        payload = {'name': '', 'description': 'Missing name', 'capacity': 2} # Name is required
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    def test_admin_update_cabin_success(self):
        url = reverse('api:admin_cabin-detail', kwargs={'pk': self.cabin1.id})
        payload = {'name': 'Updated Cabin A Name', 'capacity': 5}
        response = self.client.put(url, payload, format='json') # PUT requires all required fields
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cabin1.refresh_from_db()
        self.assertEqual(self.cabin1.name, 'Updated Cabin A Name')
        self.assertEqual(self.cabin1.capacity, 5)

    def test_admin_delete_cabin_success(self):
        url = reverse('api:admin_cabin-detail', kwargs={'pk': self.cabin1.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Cabin.objects.filter(id=self.cabin1.id).exists())

    def test_admin_cabin_access_denied_for_therapist(self):
        self.client.force_authenticate(user=self.therapist_user)
        url = reverse('api:admin_cabin-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # Slot Management by Admin
    def test_admin_create_available_slot_success(self):
        url = reverse('api:admin_slot_create')
        payload = {
            'cabin': self.cabin1.id,
            'start_time': (self.utc.localize(datetime.now() + timedelta(days=20, hours=10))).isoformat(),
            'end_time': (self.utc.localize(datetime.now() + timedelta(days=20, hours=12))).isoformat(),
            'price': '75.00'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Booking.objects.filter(cabin=self.cabin1, price=Decimal('75.00')).exists())
        new_slot = Booking.objects.get(cabin=self.cabin1, price=Decimal('75.00'))
        self.assertEqual(new_slot.status, 'available')
        self.assertIsNone(new_slot.therapist)

    def test_admin_list_available_slots(self):
        url = reverse('api:admin_slot_list_available')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(slot['id'] == self.available_slot_by_admin.id for slot in response.data))
        # Ensure it doesn't list booked slots
        self.assertFalse(any(slot['id'] == self.booked_slot.id for slot in response.data))

    def test_admin_delete_available_slot_success(self):
        url = reverse('api:admin_slot_delete', kwargs={'pk': self.available_slot_by_admin.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Booking.objects.filter(id=self.available_slot_by_admin.id).exists())

    def test_admin_delete_booked_slot_via_available_slot_endpoint_fail(self):
        # This endpoint should only delete 'available' slots
        url = reverse('api:admin_slot_delete', kwargs={'pk': self.booked_slot.id})
        response = self.client.delete(url)
        # The queryset for this view is Booking.objects.filter(status='available', therapist__isnull=True)
        # So a booked slot will result in a 404 from get_object()
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) 

    # All Bookings Management
    def test_admin_list_all_bookings(self):
        url = reverse('api:admin_bookings_all')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking_ids = [b['id'] for b in response.data]
        self.assertIn(self.available_slot_by_admin.id, booking_ids)
        self.assertIn(self.booked_slot.id, booking_ids)

    def test_admin_list_all_bookings_filter_status(self):
        url = reverse('api:admin_bookings_all') + '?status=booked'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for booking in response.data:
            self.assertEqual(booking['status'], 'booked')
        self.assertTrue(any(b['id'] == self.booked_slot.id for b in response.data))
        self.assertFalse(any(b['id'] == self.available_slot_by_admin.id for b in response.data))

    @patch('api.views.send_app_email')
    def test_admin_cancel_booking_success(self, mock_send_email):
        url = reverse('api:admin_booking_cancel', kwargs={'pk': self.booked_slot.id})
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booked_slot.refresh_from_db()
        self.assertEqual(self.booked_slot.status, 'cancelled')
        # Check if email sent to therapist
        mock_send_email.assert_called_once()
        self.assertIn(self.therapist_user.email, mock_send_email.call_args[0][2]) # Recipient list

    def test_admin_cancel_already_cancelled_booking(self):
        self.booked_slot.status = 'cancelled'
        self.booked_slot.save()
        url = reverse('api:admin_booking_cancel', kwargs={'pk': self.booked_slot.id})
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN) # View's get_object check

    def tearDown(self):
        self.client.logout()
        super().tearDown()
