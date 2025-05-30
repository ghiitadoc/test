from django.contrib import admin
from .models import User, Cabin, Booking

# Register your models here.
admin.site.register(User)
admin.site.register(Cabin)
admin.site.register(Booking)
