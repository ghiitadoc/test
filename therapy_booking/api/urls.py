from django.urls import path, include # Import include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    TherapistRegistrationView,
    UserLoginView, 
    TherapistProfileView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    CabinViewSet, 
    AvailableSlotCreateView, 
    AvailableSlotListView,
    AvailableSlotDeleteView,
    # Therapist Booking Flow Views
    TherapistAvailableSlotsListView,
    TherapistBookSlotView,
    TherapistMyBookingsListView,
    TherapistCancelBookingView,
    # Admin Booking Management Views
    AdminListAllBookingsView,
    AdminCancelBookingView,
)

app_name = 'api'

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'admin/cabins', CabinViewSet, basename='admin_cabin') # For admin cabin CRUD

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)), 
    # Auth
    path('auth/register/therapist/', TherapistRegistrationView.as_view(), name='therapist_register'),
    path('auth/login/', UserLoginView.as_view(), name='token_obtain_pair'), # For login
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # For refreshing JWT tokens

    # Therapist Profile
    path('therapist/profile/', TherapistProfileView.as_view(), name='therapist_profile'),

    # Password Reset
    path('auth/password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # Admin Slot Management (from previous subtask)
    path('admin/slots/create/', AvailableSlotCreateView.as_view(), name='admin_slot_create'),
    path('admin/slots/available/', AvailableSlotListView.as_view(), name='admin_slot_list_available'),
    path('admin/slots/<int:pk>/delete/', AvailableSlotDeleteView.as_view(), name='admin_slot_delete'),

    # Therapist Booking Flow
    path('therapist/slots/available/', TherapistAvailableSlotsListView.as_view(), name='therapist_slots_available'),
    path('therapist/slots/<int:pk>/book/', TherapistBookSlotView.as_view(), name='therapist_slot_book'),
    path('therapist/bookings/mine/', TherapistMyBookingsListView.as_view(), name='therapist_bookings_mine'),
    path('therapist/bookings/<int:pk>/cancel/', TherapistCancelBookingView.as_view(), name='therapist_booking_cancel'),

    # Admin Booking Management
    path('admin/bookings/all/', AdminListAllBookingsView.as_view(), name='admin_bookings_all'),
    path('admin/bookings/<int:pk>/cancel/', AdminCancelBookingView.as_view(), name='admin_booking_cancel'),
]
