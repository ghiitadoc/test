from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_app_email(subject, message, recipient_list, html_message=None, fail_silently=False):
    """
    Helper function to send emails using Django's send_mail.
    """
    if not recipient_list:
        logger.warning("send_app_email called with no recipients for subject: %s", subject)
        return False

    # Ensure recipient_list contains valid email addresses (basic check)
    valid_recipient_list = [email for email in recipient_list if isinstance(email, str) and '@' in email]
    
    if not valid_recipient_list:
        logger.error("No valid email addresses in recipient_list for subject: %s. Original list: %s", subject, recipient_list)
        return False

    try:
        send_mail(
            subject,
            message, # Plain text message
            settings.DEFAULT_FROM_EMAIL,
            valid_recipient_list,
            html_message=html_message, # Optional HTML message
            fail_silently=fail_silently,
        )
        logger.info(f"Email sent successfully to {valid_recipient_list} with subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"Error sending email to {valid_recipient_list} with subject '{subject}': {e}", exc_info=True)
        if not fail_silently:
            # Depending on app's needs, you might want to re-raise or handle differently
            # For now, just logging and returning False if fail_silently is False
            pass 
        return False
