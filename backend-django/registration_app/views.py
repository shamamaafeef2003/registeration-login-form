# views.py - Django Views
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Avg, Min, Max
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from .models import User
from .serializers import UserSerializer, UserCreateSerializer
import logging

logger = logging.getLogger(__name__)

class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'limit'
    max_page_size = 100

class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for User CRUD operations"""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    pagination_class = CustomPagination
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        """Filter queryset based on query parameters"""
        queryset = User.objects.all()
        
        # Filter by gender
        gender = self.request.query_params.get('gender')
        if gender in ['Male', 'Female']:
            queryset = queryset.filter(gender=gender)
        
        # Filter by age range
        min_age = self.request.query_params.get('min_age')
        max_age = self.request.query_params.get('max_age')
        
        if min_age:
            try:
                queryset = queryset.filter(age__gte=int(min_age))
            except ValueError:
                pass
                
        if max_age:
            try:
                queryset = queryset.filter(age__lte=int(max_age))
            except ValueError:
                pass
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) |
                Q(birth_place__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new user with validation"""
        try:
            serializer = self.get_serializer(data=request.data)
            
            if serializer.is_valid():
                # Additional validation
                validated_data = serializer.validated_data
                
                # Check for duplicate users
                existing_user = User.objects.filter(
                    full_name=validated_data['full_name'],
                    birth_year=validated_data['birth_year'],
                    birth_month=validated_data['birth_month'],
                    birth_day=validated_data['birth_day']
                ).first()
                
                if existing_user:
                    return Response({
                        'error': 'User already exists',
                        'message': 'A user with the same name and date of birth already exists'
                    }, status=status.HTTP_409_CONFLICT)
                
                # Create user
                user = serializer.save()
                
                logger.info(f"New user registered: {user.full_name}")
                
                return Response({
                    'message': 'User registered successfully',
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                'error': 'Validation failed',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except ValidationError as e:
            return Response({
                'error': 'Age validation failed',
                'details': e.message_dict if hasattr(e, 'message_dict') else str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response({
                'error': 'Internal server error',
                'message': 'Registration failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, *args, **kwargs):
        """Update user with validation"""
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            
            if serializer.is_valid():
                user = serializer.save()
                
                logger.info(f"User updated: {user.full_name}")
                
                return Response({
                    'message': 'User updated successfully',
                    'user': UserSerializer(user).data
                })
            
            return Response({
                'error': 'Validation failed',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except ValidationError as e:
            return Response({
                'error': 'Age validation failed',
                'details': e.message_dict if hasattr(e, 'message_dict') else str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            logger.error(f"Update error: {str(e)}")
            return Response({
                'error': 'Internal server error',
                'message': 'Update failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get user statistics"""
        try:
            total_users = User.objects.count()
            
            if total_users == 0:
                return Response({
                    'overview': {
                        'total_users': 0,
                        'male_count': 0,
                        'female_count': 0,
                        'avg_age': 0,
                        'min_age': 0,
                        'max_age': 0
                    },
                    'age_distribution': []
                })
            
            # Basic statistics
            stats = User.objects.aggregate(
                male_count=Count('id', filter=Q(gender='Male')),
                female_count=Count('id', filter=Q(gender='Female')),
                avg_age=Avg('age'),
                min_age=Min('age'),
                max_age=Max('age')
            )
            
            # Age distribution
            age_ranges = [
                (18, 24, '18-24'),
                (25, 29, '25-29'),
                (30, 34, '30-34'),
                (35, 39, '35-39'),
                (40, 100, '40+')
            ]
            
            age_distribution = []
            for min_age, max_age, label in age_ranges:
                count = User.objects.filter(age__gte=min_age, age__lte=max_age).count()
                if count > 0:
                    age_distribution.append({
                        'age_range': label,
                        'count': count
                    })
            
            return Response({
                'overview': {
                    'total_users': total_users,
                    'male_count': stats['male_count'],
                    'female_count': stats['female_count'],
                    'avg_age': round(stats['avg_age'], 1) if stats['avg_age'] else 0,
                    'min_age': stats['min_age'],
                    'max_age': stats['max_age']
                },
                'age_distribution': age_distribution
            })
            
        except Exception as e:
            logger.error(f"Stats error: {str(e)}")
            return Response({
                'error': 'Internal server error',
                'message': 'Failed to fetch statistics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def validate_age(request):
    """Validate age requirements"""
    try:
        year = request.data.get('year')
        month = request.data.get('month')
        day = request.data.get('day')
        gender = request.data.get('gender')
        
        if not all([year, month, day, gender]):
            return Response({
                'error': 'Missing required fields',
                'required': ['year', 'month', 'day', 'gender']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate age
        try:
            from datetime import date
            birth_date = date(int(year), int(month), int(day))
            today = date.today()
            age = today.year - birth_date.year
            
            if today < birth_date.replace(year=today.year):
                age -= 1
        except (ValueError, TypeError):
            return Response({
                'error': 'Invalid date',
                'message': 'Please provide a valid date'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate age requirements
        errors = []
        if gender == 'Male' and age < 21:
            errors.append('Men must be at least 21 years old')
        elif gender == 'Female' and age < 18:
            errors.append('Women must be at least 18 years old')
        
        if age > 40:
            errors.append('Maximum age for both genders is 40 years')
        
        return Response({
            'age': age,
            'is_valid': len(errors) == 0,
            'errors': errors,
            'age_requirements': {
                'male': 'Minimum 21 years',
                'female': 'Minimum 18 years',
                'maximum': 'Maximum 40 years for both'
            }
        })
        
    except Exception as e:
        logger.error(f"Age validation error: {str(e)}")
        return Response({
            'error': 'Internal server error',
            'message': 'Age validation failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    from datetime import datetime
    return Response({
        'status': 'OK',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })