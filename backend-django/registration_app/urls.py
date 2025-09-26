# urls.py - Django URL Configuration
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    # Health check
    path('api/health/', views.health_check, name='health-check'),
    
    # Age validation utility
    path('api/validate-age/', views.validate_age, name='validate-age'),
    
    # User registration (alias for convenience)
    path('api/register/', views.UserViewSet.as_view({'post': 'create'}), name='user-register'),
    
    # Include router URLs
    path('api/', include(router.urls)),
]