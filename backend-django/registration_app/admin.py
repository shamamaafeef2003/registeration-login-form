# registration_app/admin.py
from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = [
        'full_name', 'gender', 'age', 'birth_place', 
        'status', 'created_at'
    ]
    list_filter = [
        'gender', 'status', 'age', 'created_at',
        'astrological_sign'
    ]
    search_fields = [
        'full_name', 'birth_place', 'astrological_sign'
    ]
    readonly_fields = ['age', 'created_at', 'updated_at']
    list_per_page = 25
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('full_name', 'gender')
        }),
        ('Birth Details', {
            'fields': (
                'birth_year', 'birth_month', 'birth_day',
                'birth_hour', 'birth_minute', 'birth_place'
            )
        }),
        ('Physical Details', {
            'fields': ('height', 'weight')
        }),
        ('Additional Information', {
            'fields': ('astrological_sign', 'status')
        }),
        ('System Information', {
            'fields': ('age', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        """Optimize queryset for admin interface"""
        queryset = super().get_queryset(request)
        return queryset.select_related()
    
    actions = ['activate_users', 'deactivate_users']
    
    def activate_users(self, request, queryset):
        """Activate selected users"""
        updated = queryset.update(status='active')
        self.message_user(request, f'{updated} users activated successfully.')
    activate_users.short_description = "Activate selected users"
    
    def deactivate_users(self, request, queryset):
        """Deactivate selected users"""
        updated = queryset.update(status='inactive')
        self.message_user(request, f'{updated} users deactivated successfully.')
    deactivate_users.short_description = "Deactivate selected users"