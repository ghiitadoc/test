from rest_framework import permissions

class IsAdminOrSuperUser(permissions.BasePermission):
    """
    Allows access only to admin users (is_admin=True) or superusers (is_superuser=True).
    DRF's IsAdminUser checks request.user.is_staff.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_admin or request.user.is_superuser))

class IsTherapistUser(permissions.BasePermission):
    """
    Allows access only to authenticated therapist users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_therapist)

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object or admins to edit/delete it.
    Assumes the model instance has a `therapist` attribute.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        # if request.method in permissions.SAFE_METHODS:
        #     return True # Or handle this at the view level if only owners can see.

        # Instance must have an attribute named `therapist`.
        if obj.therapist == request.user:
            return True
        
        # Admin users can also perform the action.
        return bool(request.user and request.user.is_authenticated and (request.user.is_admin or request.user.is_superuser))
