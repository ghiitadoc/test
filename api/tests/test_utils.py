from django.test import TestCase
from django.conf import settings
from unittest.mock import patch, MagicMock
from api.utils import send_app_email # Adjust import path if necessary

class UtilsTests(TestCase):

    @patch('api.utils.send_mail') # Mocking Django's send_mail where it's used in api.utils
    def test_send_app_email_success(self, mock_django_send_mail):
        subject = "Test Subject"
        message = "This is a test message."
        recipient_list = ["test@example.com", "another@example.com"]
        html_message = "<p>This is a test message.</p>"
        
        result = send_app_email(subject, message, recipient_list, html_message=html_message)

        self.assertTrue(result)
        mock_django_send_mail.assert_called_once_with(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            recipient_list,
            html_message=html_message,
            fail_silently=False # Default fail_silently in send_app_email
        )

    @patch('api.utils.send_mail')
    def test_send_app_email_failure_exception(self, mock_django_send_mail):
        mock_django_send_mail.side_effect = Exception("SMTP Error")
        subject = "Test Subject Fail"
        message = "Test message."
        recipient_list = ["test@example.com"]

        result = send_app_email(subject, message, recipient_list, fail_silently=True)
        self.assertFalse(result)
        mock_django_send_mail.assert_called_once() # Ensure it was called

        # Test with fail_silently=False (default)
        # Expect it to log the error but still return False as per current util implementation
        # If we wanted it to re-raise, the util would need to change.
        result_loud = send_app_email(subject, message, recipient_list, fail_silently=False)
        self.assertFalse(result_loud)


    @patch('api.utils.send_mail')
    def test_send_app_email_no_recipients(self, mock_django_send_mail):
        result = send_app_email("Subject", "Message", [])
        self.assertFalse(result)
        mock_django_send_mail.assert_not_called()

    @patch('api.utils.send_mail')
    def test_send_app_email_invalid_recipients(self, mock_django_send_mail):
        result = send_app_email("Subject", "Message", ["invalid-email", "test@example.com", "anotherinvalid"])
        self.assertTrue(result) # It will send to the valid one
        mock_django_send_mail.assert_called_once_with(
            "Subject",
            "Message",
            settings.DEFAULT_FROM_EMAIL,
            ["test@example.com"], # Only the valid email
            html_message=None,
            fail_silently=False
        )

    @patch('api.utils.send_mail')
    def test_send_app_email_all_invalid_recipients(self, mock_django_send_mail):
        result = send_app_email("Subject", "Message", ["invalid-email", "anotherinvalid"])
        self.assertFalse(result)
        mock_django_send_mail.assert_not_called()
