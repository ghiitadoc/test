from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch # For mocking email sending

User = get_user_model()

class AuthViewTests(APITestCase):

    def setUp(self):
        self.therapist_data = {
            'username': 'newtherapist',
            'email': 'newtherapist@example.com',
            'password': 'StrongPassword123',
            'first_name': 'New',
            'last_name': 'Therapist',
            'phone_number': '0987654321'
        }
        # User for login and password reset tests
        self.existing_user = User.objects.create_user(
            username='logintest', 
            email='login@example.com', 
            password='OldPassword123',
            is_therapist=True
        )

    @patch('api.views.send_app_email') # Path to where send_app_email is imported in views.py
    def test_therapist_registration_success(self, mock_send_email):
        url = reverse('api:therapist_register') # Ensure your urls.py has app_name='api' and name='therapist_register'
        payload = self.therapist_data.copy()
        payload['password2'] = payload['password'] # Add password confirmation
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username=payload['username']).exists())
        user = User.objects.get(username=payload['username'])
        self.assertTrue(user.is_therapist)
        self.assertFalse(user.is_staff)
        mock_send_email.assert_called_once() # Check if email was sent
        self.assertEqual(mock_send_email.call_args[0][0], "Welcome to Therapy Booking Platform!") # Subject
        self.assertIn(payload['email'], mock_send_email.call_args[0][2]) # Recipient list

    def test_therapist_registration_password_mismatch(self):
        url = reverse('api:therapist_register')
        payload = self.therapist_data.copy()
        payload['password2'] = 'DifferentPassword123'
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_user_login_success(self):
        url = reverse('api:token_obtain_pair') # Default name for SimpleJWT login
        payload = {'username': 'logintest', 'password': 'OldPassword123'}
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['username'], self.existing_user.username)
        self.assertTrue(response.data['is_therapist'])

    def test_user_login_failure_wrong_password(self):
        url = reverse('api:token_obtain_pair')
        payload = {'username': 'logintest', 'password': 'WrongPassword!'}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED) # SimpleJWT returns 401 for bad creds
        self.assertIn('detail', response.data) # Should contain error detail

    def test_user_login_failure_nonexistent_user(self):
        url = reverse('api:token_obtain_pair')
        payload = {'username': 'nouser', 'password': 'password123'}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('api.views.send_app_email')
    def test_password_reset_request_success(self, mock_send_email):
        url = reverse('api:password_reset_request')
        payload = {'email': self.existing_user.email}
        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], "Password reset instructions have been sent to your email.")
        mock_send_email.assert_called_once()
        self.assertEqual(mock_send_email.call_args[0][0], "Password Reset Request") # Subject
        self.assertIn(self.existing_user.email, mock_send_email.call_args[0][2]) # Recipient
        
        # Check that a token was generated and stored in cache (simplified check)
        # This requires knowing the cache key format used in the view
        # For now, assume email sending implies token generation.
        # A more robust test would mock cache.set and check its call_args.

    def test_password_reset_request_nonexistent_email(self):
        url = reverse('api:password_reset_request')
        payload = {'email': 'nonexistent@example.com'}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data) # Serializer error

    def test_password_reset_confirm_success(self):
        # 1. Request a password reset to get a token (mocking cache)
        token = "testresettoken12345"
        cache.set(f"password_reset_{token}", self.existing_user.pk, timeout=3600)

        url = reverse('api:password_reset_confirm')
        payload = {
            'token': token,
            'new_password': 'NewStrongerPassword123',
            'confirm_new_password': 'NewStrongerPassword123'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], "Password has been reset successfully.")

        # Verify password changed
        self.existing_user.refresh_from_db()
        self.assertTrue(self.existing_user.check_password('NewStrongerPassword123'))
        self.assertIsNone(cache.get(f"password_reset_{token}")) # Token should be deleted

    def test_password_reset_confirm_invalid_token(self):
        url = reverse('api:password_reset_confirm')
        payload = {
            'token': 'invalidtoken',
            'new_password': 'NewPassword123',
            'confirm_new_password': 'NewPassword123'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], "Invalid or expired token.")
        
    def test_password_reset_confirm_password_mismatch(self):
        token = "testresettoken789"
        cache.set(f"password_reset_{token}", self.existing_user.pk, timeout=3600)
        url = reverse('api:password_reset_confirm')
        payload = {
            'token': token,
            'new_password': 'NewPassword123',
            'confirm_new_password': 'DifferentPassword123'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data) # Serializer error for mismatch
        # Ensure cache token is not deleted on validation failure
        self.assertIsNotNone(cache.get(f"password_reset_{token}"))
        cache.delete(f"password_reset_{token}") # Clean up

    def tearDown(self):
        cache.clear() # Clear cache after tests, especially for password reset tokens
        super().tearDown()
