from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Cabin, Booking # Import Cabin and Booking
import uuid # For password reset token generation

User = get_user_model()

class TherapistRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm password")

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name', 'phone_number')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True},
            'phone_number': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        # Ensure email is unique during registration
        if User.objects.filter(email=attrs.get('email')).exists():
            raise serializers.ValidationError({"email": "This email is already in use."})
        if User.objects.filter(username=attrs.get('username')).exists():
            raise serializers.ValidationError({"username": "This username is already in use."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_number=validated_data['phone_number'],
            is_therapist=True,
            is_staff=False # Therapists are not staff by default
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer for user details (excluding password)"""
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'is_therapist', 'is_admin')
        read_only_fields = ('id', 'username', 'is_therapist', 'is_admin') # username should not be changed via this serializer

class TherapistProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'phone_number')
        extra_kwargs = {
            'email': {'required': False}, # Allow partial updates
            'first_name': {'required': False},
            'last_name': {'required': False},
            'phone_number': {'required': False},
        }

    def validate_email(self, value):
        # Ensure email, if provided, is unique, excluding the current user
        user = self.context['request'].user
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This email is already in use by another account.")
        return value
    
    def update(self, instance, validated_data):
        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.phone_number = validated_data.get('phone_number', instance.phone_number)
        instance.save()
        return instance

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email does not exist.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_new_password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        
        # Basic token validation (in a real app, this would involve checking expiry and a secure token model)
        # For now, we'll assume the token is the username of the user requesting reset,
        # and it's stored temporarily (e.g. in cache or a simple model not implemented here for brevity)
        # This part needs to be connected with how tokens are generated and stored in the view.
        # For this example, we'll assume the token is directly usable to find the user.
        # A better approach would be a dedicated PasswordResetToken model.
        try:
            # This is a placeholder. Actual token validation logic will be in the view.
            # The serializer is just for field validation here.
            uuid.UUID(attrs['token']) # Check if token is a valid UUID
        except ValueError:
            # If not a UUID, it might be another format, or this check is too simple.
            # For now, we'll let it pass serializer validation and handle in view.
            pass # Or raise serializers.ValidationError({"token": "Invalid token format."}) if strict format needed here
        return attrs


# Cabin Serializer
class CabinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cabin
        fields = ('id', 'name', 'description', 'capacity')

# Booking Serializer (General Purpose)
class BookingSerializer(serializers.ModelSerializer):
    therapist_username = serializers.CharField(source='therapist.username', read_only=True)
    cabin_name = serializers.CharField(source='cabin.name', read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id', 
            'therapist', 
            'therapist_username', # Read-only representation
            'cabin', 
            'cabin_name', # Read-only representation
            'start_time', 
            'end_time', 
            'status', 
            'price'
        )
        read_only_fields = ('status',) # Status is managed by specific actions/views typically

# Serializer for Admin creating an "available" slot
class AvailableSlotCreateSerializer(serializers.ModelSerializer):
    cabin = serializers.PrimaryKeyRelatedField(queryset=Cabin.objects.all(), write_only=True, help_text="ID of the Cabin")
    
    class Meta:
        model = Booking
        fields = ('id', 'cabin', 'start_time', 'end_time', 'price') # Therapist is excluded, status defaults to 'available'
        extra_kwargs = {
            'price': {'required': True, 'allow_null': False}, # Ensure price is provided
            'start_time': {'required': True},
            'end_time': {'required': True},
        }

    def validate(self, attrs):
        # Ensure start_time is before end_time
        if attrs['start_time'] >= attrs['end_time']:
            raise serializers.ValidationError("End time must be after start time.")
        # Add any other validation, e.g., check for overlapping available slots for the same cabin
        # For simplicity, overlap check is omitted here but crucial for a real app.
        return attrs

    def create(self, validated_data):
        # Status is 'available' by default from the model
        # Therapist is null by default as per model changes
        booking = Booking.objects.create(**validated_data, status='available')
        return booking

# Serializer for listing available slots (can reuse BookingSerializer or be more specific)
class AvailableSlotListSerializer(BookingSerializer): # Inherits from BookingSerializer
    class Meta(BookingSerializer.Meta):
        pass # For now, same fields as BookingSerializer. Can be customized if needed.
