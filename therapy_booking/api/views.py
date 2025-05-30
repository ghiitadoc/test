from django.contrib.auth import get_user_model, authenticate
from django.core.cache import cache # Using cache for password reset tokens
from django.utils.crypto import get_random_string # More secure token generation
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import generics, status, permissions, viewsets
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
import uuid # For generating reset tokens

from .models import Cabin, Booking # Import Cabin and Booking
from .serializers import (
    TherapistRegistrationSerializer,
    UserLoginSerializer,
    UserDetailSerializer,
    TherapistProfileSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    CabinSerializer, # Import new serializers
    AvailableSlotCreateSerializer,
    BookingSerializer, # For listing available slots (or a more specific one if created)
    # AvailableSlotListSerializer, # Using BookingSerializer for now
)
# Import custom permissions
from .permissions import IsAdminOrSuperUser, IsTherapistUser, IsOwnerOrAdmin
from .utils import send_app_email # Import the email utility
from django.conf import settings # To get ADMIN_EMAIL_LIST


User = get_user_model()

# Custom Permission for Admin Users (alternative to IsAdminUser if more checks are needed)
# For now, we will use permissions.IsAdminUser directly for some admin views,
# and IsAdminOrSuperUser for others where we want to be explicit about our User model's is_admin field.
# Example: permission_classes = [IsAdminOrSuperUser]

class TherapistRegistrationView(generics.CreateAPIView):
    serializer_class = TherapistRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user_data = UserDetailSerializer(user).data

        # Send welcome email
        try:
            subject = "Welcome to Therapy Booking Platform!"
            message = (
                f"Hi {user.first_name or user.username},\n\n"
                f"Welcome to the Therapy Booking Platform! Your account has been successfully created.\n\n"
                f"You can now log in and start exploring available cabin slots.\n\n"
                f"Regards,\nThe Therapy Booking Team"
            )
            send_app_email(subject, message, [user.email], fail_silently=True) # Fail silently for registration email
        except Exception as e:
            # Log error but don't fail the registration if email sending fails
            print(f"Error sending registration email to {user.email}: {e}") # Replace with proper logging

        return Response(user_data, status=status.HTTP_201_CREATED)

class UserLoginView(TokenObtainPairView):
    # Uses SimpleJWT's TokenObtainPairSerializer by default
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            user = User.objects.get(username=request.data['username'])
            response.data['user_id'] = user.id
            response.data['username'] = user.username
            response.data['is_therapist'] = user.is_therapist
            response.data['is_admin'] = user.is_admin
        return response

class TherapistProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = TherapistProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Ensure that only therapists can access this view
        # and they can only access their own profile.
        user = self.request.user
        if not user.is_therapist:
            # This should ideally be caught by a more specific permission class
            # but an explicit check here is also fine.
            self.permission_denied(
                self.request, message="You do not have permission to perform this action."
            )
        return user

    def get_serializer_context(self):
        # Pass request to serializer context for email validation
        return {'request': self.request}

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = UserDetailSerializer(instance) # Use UserDetailSerializer for GET
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(UserDetailSerializer(instance).data) # Return full user details

# Basic Password Reset (using cache for token storage)
# In a production app, consider a dedicated model for PasswordResetToken for persistence and security.

class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.objects.get(email=email) # Validation ensures user exists
        
        # Generate a unique token
        token = get_random_string(length=32) # More secure than just UUID
        
        # Store token in cache with user's pk and expiry (e.g., 1 hour)
        cache.set(f"password_reset_{token}", user.pk, timeout=3600)
        
        # Simulate sending email (in a real app, use Django's email utilities)
        # print(f"Password reset token for {email}: {token}") # Log for testing
        
        # Send password reset email
        try:
            # Construct reset URL (adjust frontend_url as needed)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000') 
            reset_url = f"{frontend_url}/password-reset-confirm?token={token}" # Example frontend path

            subject = "Password Reset Request"
            message = (
                f"Hi {user.username},\n\n"
                f"You requested a password reset. Use the following token to reset your password:\n\n"
                f"Token: {token}\n\n"
                f"Alternatively, you can click the link below (if your frontend supports it):\n"
                f"{reset_url}\n\n"
                f"If you did not request this, please ignore this email.\n\n"
                f"Regards,\nThe Therapy Booking Team"
            )
            send_app_email(subject, message, [email], fail_silently=False) # Should fail loudly if email config is wrong
            return Response(
                {"message": "Password reset instructions have been sent to your email."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            # Log error
            print(f"Error sending password reset email to {email}: {e}") # Replace with proper logging
            return Response(
                {"error": "There was an issue sending the password reset email. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        user_pk = cache.get(f"password_reset_{token}")
        
        if not user_pk:
            return Response({"error": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(pk=user_pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_400_BAD_REQUEST) # Should not happen if token is valid
            
        user.set_password(new_password)
        user.save()
        
        # Invalidate the token by deleting it from cache
        cache.delete(f"password_reset_{token}")
        
        return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)


# Admin Views

class CabinViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for Cabins.
    """
    queryset = Cabin.objects.all()
    serializer_class = CabinSerializer
    permission_classes = [IsAdminOrSuperUser] # Using custom admin permission

class AvailableSlotCreateView(generics.CreateAPIView):
    """
    Admin creates an available slot (Booking with status='available').
    """
    serializer_class = AvailableSlotCreateSerializer
    permission_classes = [IsAdminOrSuperUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # The serializer's create method handles setting status to 'available'
        # and ensuring therapist is null.
        slot = serializer.save() 
        # Return full booking details using BookingSerializer for the response
        response_serializer = BookingSerializer(slot)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

class AvailableSlotListView(generics.ListAPIView):
    """
    Admin views available slots.
    Supports filtering by cabin_id and date.
    """
    serializer_class = BookingSerializer # Use BookingSerializer to display full slot details
    permission_classes = [IsAdminOrSuperUser]

    def get_queryset(self):
        queryset = Booking.objects.filter(status='available', therapist__isnull=True)
        
        cabin_id = self.request.query_params.get('cabin_id')
        if cabin_id:
            queryset = queryset.filter(cabin_id=cabin_id)
            
        date_str = self.request.query_params.get('date')
        if date_str:
            filter_date = parse_date(date_str)
            if filter_date:
                # Filter for slots that are active on this date
                # This means start_time is before or on the date, and end_time is on or after the date.
                # For simplicity, filtering for slots that START on the given date.
                # A more complex range overlap might be:
                # queryset = queryset.filter(start_time__date__lte=filter_date, end_time__date__gte=filter_date)
                queryset = queryset.filter(start_time__date=filter_date)
                
        return queryset.order_by('start_time')

class AvailableSlotDeleteView(generics.DestroyAPIView):
    """
    Admin deletes an available slot.
    """
    queryset = Booking.objects.filter(status='available', therapist__isnull=True)
    serializer_class = BookingSerializer # Not strictly needed for delete, but good practice
    permission_classes = [IsAdminOrSuperUser]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Additional check: ensure it's truly an 'available' slot not yet picked up
        if instance.status != 'available' or instance.therapist is not None:
            return Response(
                {"error": "This slot is not available or has been assigned, and cannot be deleted via this endpoint."},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# Therapist Views

class TherapistAvailableSlotsListView(generics.ListAPIView):
    """
    Therapists list available slots.
    Supports filtering by cabin_id, start_date, and end_date.
    """
    serializer_class = BookingSerializer 
    permission_classes = [IsTherapistUser]

    def get_queryset(self):
        queryset = Booking.objects.filter(status='available', therapist__isnull=True)
        
        cabin_id = self.request.query_params.get('cabin_id')
        if cabin_id:
            queryset = queryset.filter(cabin_id=cabin_id)
            
        start_date_str = self.request.query_params.get('start_date')
        if start_date_str:
            start_date = parse_date(start_date_str)
            if start_date:
                queryset = queryset.filter(start_time__date__gte=start_date)
        
        end_date_str = self.request.query_params.get('end_date')
        if end_date_str:
            end_date = parse_date(end_date_str)
            if end_date:
                queryset = queryset.filter(end_time__date__lte=end_date)
                
        return queryset.order_by('start_time')

class TherapistBookSlotView(generics.UpdateAPIView):
    """
    Therapist books an available slot.
    Updates therapist to self and status to 'booked'.
    """
    queryset = Booking.objects.all() # Will filter in get_object
    serializer_class = BookingSerializer
    permission_classes = [IsTherapistUser]

    def get_object(self):
        booking = super().get_object()
        if booking.status != 'available' or booking.therapist is not None:
            raise PermissionDenied("This slot is not available for booking.") # Or 409 Conflict
        return booking

    def perform_update(self, serializer):
        # Check again before saving, in case of race conditions (though less likely with DB transactions)
        instance = serializer.instance
        if instance.status != 'available' or instance.therapist is not None:
             # Raising validation error to give a 400 response
            raise serializers.ValidationError("Slot is no longer available.", code="conflict")

        serializer.save(therapist=self.request.user, status='booked')
        
        # Send confirmation emails
        booking = serializer.instance # The updated booking instance
        therapist_user = self.request.user
        cabin = booking.cabin
        
        try:
            # To Therapist
            subject_therapist = f"Your Booking Confirmation - {cabin.name} on {booking.start_time.strftime('%Y-%m-%d')}"
            message_therapist = (
                f"Hi {therapist_user.first_name or therapist_user.username},\n\n"
                f"Your booking for {cabin.name} has been confirmed.\n"
                f"Details:\n"
                f"  Cabin: {cabin.name}\n"
                f"  Start Time: {booking.start_time.strftime('%Y-%m-%d %H:%M')}\n"
                f"  End Time: {booking.end_time.strftime('%Y-%m-%d %H:%M')}\n"
                f"  Price: ${booking.price}\n\n"
                f"Thank you,\nThe Therapy Booking Team"
            )
            send_app_email(subject_therapist, message_therapist, [therapist_user.email], fail_silently=True)

            # To Admin(s)
            subject_admin = f"New Booking Alert: {cabin.name} by {therapist_user.username}"
            message_admin = (
                f"A new booking has been made:\n\n"
                f"  Therapist: {therapist_user.username} (ID: {therapist_user.id})\n"
                f"  Cabin: {cabin.name} (ID: {cabin.id})\n"
                f"  Start Time: {booking.start_time.strftime('%Y-%m-%d %H:%M')}\n"
                f"  End Time: {booking.end_time.strftime('%Y-%m-%d %H:%M')}\n"
                f"  Price: ${booking.price}\n"
                f"  Booking ID: {booking.id}\n"
            )
            admin_emails = getattr(settings, 'ADMIN_EMAIL_LIST', [])
            if admin_emails:
                send_app_email(subject_admin, message_admin, admin_emails, fail_silently=True)
        except Exception as e:
            print(f"Error sending booking confirmation emails for booking {booking.id}: {e}")


    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True) # Allow partial update-like behavior for just changing therapist and status
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        # We are not expecting any data in the request body for this action,
        # but serializer validation still runs. If it had required fields not part of the URL, it would fail.
        # For this specific case, we are setting fields directly in perform_update.
        # An alternative would be a custom serializer with no input fields, just for this action.
        serializer.is_valid(raise_exception=True) # Basic validation
        
        try:
            self.perform_update(serializer)
        except serializers.ValidationError as e:
             # Catch validation error from perform_update (e.g. slot no longer available)
            if e.code == "conflict":
                return Response({"detail": str(e.detail[0])}, status=status.HTTP_409_CONFLICT)
            raise e # Re-raise other validation errors
            
        return Response(serializer.data)


class TherapistMyBookingsListView(generics.ListAPIView):
    """
    Therapist lists their own bookings.
    Supports filtering by status and period (upcoming/past).
    """
    serializer_class = BookingSerializer
    permission_classes = [IsTherapistUser]

    def get_queryset(self):
        queryset = Booking.objects.filter(therapist=self.request.user)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        period_filter = self.request.query_params.get('period')
        if period_filter == 'upcoming':
            queryset = queryset.filter(start_time__gte=timezone.now())
        elif period_filter == 'past':
            queryset = queryset.filter(end_time__lt=timezone.now())
            
        return queryset.order_by('start_time')

class TherapistCancelBookingView(generics.UpdateAPIView):
    """
    Therapist cancels their own booking.
    Sets status to 'cancelled'.
    """
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsTherapistUser, IsOwnerOrAdmin] # IsOwnerOrAdmin checks obj.therapist

    def get_object(self):
        booking = super().get_object()
        if booking.therapist != self.request.user: # Double check ownership
             raise PermissionDenied("You do not own this booking.")
        if booking.status != 'booked':
            raise PermissionDenied("This booking cannot be cancelled (it's not in 'booked' status).")
        
        # Optional: Check cancellation window
        # if booking.start_time < timezone.now() + timezone.timedelta(hours=24): # Example: 24 hours
        #     raise PermissionDenied("Cannot cancel booking within 24 hours of start time.")
        return booking

    def perform_update(self, serializer):
        # Check again before saving
        instance = serializer.instance
        if instance.status != 'booked':
             raise serializers.ValidationError("Booking is no longer in a cancellable state.", code="conflict")
        serializer.save(status='cancelled')
        # Optionally, could re-open the slot:
        # serializer.save(status='available', therapist=None)
        
        # Send cancellation emails
        booking = serializer.instance
        therapist_user = self.request.user # This is the therapist who initiated cancellation
        cabin = booking.cabin

        try:
            # To Therapist
            subject_therapist = f"Your Booking Cancellation - {cabin.name} on {booking.start_time.strftime('%Y-%m-%d')}"
            message_therapist = (
                f"Hi {therapist_user.first_name or therapist_user.username},\n\n"
                f"Your booking for {cabin.name} from {booking.start_time.strftime('%Y-%m-%d %H:%M')} to {booking.end_time.strftime('%Y-%m-%d %H:%M')} has been cancelled.\n\n"
                f"If you have any questions, please contact support.\n\n"
                f"Regards,\nThe Therapy Booking Team"
            )
            send_app_email(subject_therapist, message_therapist, [therapist_user.email], fail_silently=True)

            # To Admin(s)
            subject_admin = f"Booking Cancellation Alert: {cabin.name} by {therapist_user.username}"
            message_admin = (
                f"A booking has been cancelled by the therapist:\n\n"
                f"  Therapist: {therapist_user.username} (ID: {therapist_user.id})\n"
                f"  Cabin: {cabin.name} (ID: {cabin.id})\n"
                f"  Original Start Time: {booking.start_time.strftime('%Y-%m-%d %H:%M')}\n"
                f"  Original End Time: {booking.end_time.strftime('%Y-%m-%d %H:%M')}\n"
                f"  Booking ID: {booking.id}\n"
            )
            admin_emails = getattr(settings, 'ADMIN_EMAIL_LIST', [])
            if admin_emails:
                send_app_email(subject_admin, message_admin, admin_emails, fail_silently=True)
        except Exception as e:
            print(f"Error sending cancellation confirmation emails for booking {booking.id}: {e}")


    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_update(serializer)
        except serializers.ValidationError as e:
            if e.code == "conflict":
                return Response({"detail": str(e.detail[0])}, status=status.HTTP_409_CONFLICT)
            raise e
        return Response(serializer.data)


# Admin Booking Management Views

class AdminListAllBookingsView(generics.ListAPIView):
    """
    Admin lists all bookings.
    Supports filtering by cabin_id, therapist_id, date, and status.
    """
    serializer_class = BookingSerializer
    permission_classes = [IsAdminOrSuperUser]

    def get_queryset(self):
        queryset = Booking.objects.all()
        
        cabin_id = self.request.query_params.get('cabin_id')
        if cabin_id:
            queryset = queryset.filter(cabin_id=cabin_id)

        therapist_id = self.request.query_params.get('therapist_id')
        if therapist_id:
            queryset = queryset.filter(therapist_id=therapist_id)
            
        date_str = self.request.query_params.get('date')
        if date_str:
            filter_date = parse_date(date_str)
            if filter_date:
                queryset = queryset.filter(start_time__date=filter_date) # Slots starting on this date
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset.order_by('start_time')

class AdminCancelBookingView(generics.UpdateAPIView):
    """
    Admin cancels any booking.
    Sets status to 'cancelled'.
    """
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAdminOrSuperUser]

    def get_object(self):
        booking = super().get_object()
        if booking.status == 'cancelled': # Or any other status that shouldn't be admin-cancelled
            raise PermissionDenied(f"This booking is already in '{booking.status}' status.")
        return booking

    def perform_update(self, serializer):
        # Admin can decide to make it available again or just cancel
        # For now, just cancelling.
        original_therapist = serializer.instance.therapist # Get therapist before update
        serializer.save(status='cancelled')
        
        # Send notification to therapist if a therapist was assigned
        if original_therapist:
            booking = serializer.instance
            cabin = booking.cabin
            try:
                subject_therapist = f"Booking Update: Your booking for {cabin.name} has been cancelled"
                message_therapist = (
                    f"Hi {original_therapist.first_name or original_therapist.username},\n\n"
                    f"Please be advised that your booking for {cabin.name} from {booking.start_time.strftime('%Y-%m-%d %H:%M')} to {booking.end_time.strftime('%Y-%m-%d %H:%M')} has been cancelled by an administrator.\n\n"
                    f"If you have any questions, please contact administration.\n\n"
                    f"Regards,\nThe Therapy Booking Team"
                )
                send_app_email(subject_therapist, message_therapist, [original_therapist.email], fail_silently=True)
            except Exception as e:
                 print(f"Error sending admin cancellation email to therapist for booking {booking.id}: {e}")
        # Optionally notify other admins


    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
