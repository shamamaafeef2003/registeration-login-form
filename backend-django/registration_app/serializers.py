# serializers.py - Django REST Framework Serializers
from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import User
import re

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model - read operations"""
    
    date_of_birth = serializers.SerializerMethodField()
    time_of_birth = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'date_of_birth', 'time_of_birth',
            'birth_place', 'gender', 'height', 'weight',
            'astrological_sign', 'age', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'age', 'created_at', 'updated_at']
    
    def get_date_of_birth(self, obj):
        """Format date of birth as object"""
        return {
            'year': obj.birth_year,
            'month': obj.birth_month,
            'day': obj.birth_day
        }
    
    def get_time_of_birth(self, obj):
        """Format time of birth as object"""
        return {
            'hour': obj.birth_hour or '',
            'minute': obj.birth_minute or ''
        }


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for User model - create/update operations"""
    
    full_name = serializers.CharField(
        max_length=100,
        help_text="Full name (letters and spaces only)"
    )
    birth_year = serializers.CharField(
        max_length=4,
        help_text="Birth year (4 digits)"
    )
    birth_month = serializers.CharField(
        max_length=2,
        help_text="Birth month (01-12)"
    )
    birth_day = serializers.CharField(
        max_length=2,
        help_text="Birth day (01-31)"
    )
    birth_hour = serializers.CharField(
        max_length=2,
        required=False,
        allow_blank=True,
        help_text="Birth hour (00-23)"
    )
    birth_minute = serializers.CharField(
        max_length=2,
        required=False,
        allow_blank=True,
        help_text="Birth minute (00-59)"
    )
    birth_place = serializers.CharField(
        max_length=200,
        required=False,
        allow_blank=True,
        help_text="Place of birth"
    )
    gender = serializers.ChoiceField(
        choices=User.GENDER_CHOICES,
        help_text="Gender selection"
    )
    height = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        help_text="Height in feet/inches or cm"
    )
    weight = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        help_text="Weight in kg"
    )
    astrological_sign = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        help_text="Astrological sign (Rashi)"
    )

    class Meta:
        model = User
        fields = [
            'full_name', 'birth_year', 'birth_month', 'birth_day',
            'birth_hour', 'birth_minute', 'birth_place', 'gender',
            'height', 'weight', 'astrological_sign'
        ]

    def validate_full_name(self, value):
        """Validate full name format"""
        if not value.strip():
            raise serializers.ValidationError("Full name cannot be empty")
        
        if not re.match(r'^[a-zA-Z\s]+$', value.strip()):
            raise serializers.ValidationError(
                "Full name can only contain letters and spaces"
            )
        
        if len(value.strip()) < 2:
            raise serializers.ValidationError(
                "Full name must be at least 2 characters long"
            )
        
        return value.strip()

    def validate_birth_year(self, value):
        """Validate birth year"""
        try:
            year = int(value)
            current_year = 2025  # Current year based on context
            
            if year < 1940 or year > current_year:
                raise serializers.ValidationError(
                    f"Birth year must be between 1940 and {current_year}"
                )
            
            return value
        except ValueError:
            raise serializers.ValidationError("Birth year must be a valid number")

    def validate_birth_month(self, value):
        """Validate birth month"""
        valid_months = ['01', '02', '03', '04', '05', '06', 
                       '07', '08', '09', '10', '11', '12']
        
        if value not in valid_months:
            raise serializers.ValidationError(
                "Birth month must be between 01 and 12"
            )
        
        return value

    def validate_birth_day(self, value):
        """Validate birth day"""
        try:
            day = int(value)
            if day < 1 or day > 31:
                raise serializers.ValidationError(
                    "Birth day must be between 1 and 31"
                )
            
            return value.zfill(2)  # Ensure 2 digits
        except ValueError:
            raise serializers.ValidationError("Birth day must be a valid number")

    def validate_birth_hour(self, value):
        """Validate birth hour if provided"""
        if value and value.strip():
            try:
                hour = int(value)
                if hour < 0 or hour > 23:
                    raise serializers.ValidationError(
                        "Birth hour must be between 0 and 23"
                    )
                return value.zfill(2)  # Ensure 2 digits
            except ValueError:
                raise serializers.ValidationError("Birth hour must be a valid number")
        
        return value

    def validate_birth_minute(self, value):
        """Validate birth minute if provided"""
        if value and value.strip():
            try:
                minute = int(value)
                if minute < 0 or minute > 59:
                    raise serializers.ValidationError(
                        "Birth minute must be between 0 and 59"
                    )
                return value.zfill(2)  # Ensure 2 digits
            except ValueError:
                raise serializers.ValidationError("Birth minute must be a valid number")
        
        return value

    def validate(self, data):
        """Cross-field validation"""
        # Validate complete date
        try:
            from datetime import date
            year = int(data['birth_year'])
            month = int(data['birth_month'])
            day = int(data['birth_day'])
            
            # Check if date is valid
            birth_date = date(year, month, day)
            
            # Check if date is not in future
            if birth_date > date.today():
                raise serializers.ValidationError(
                    "Birth date cannot be in the future"
                )
            
        except ValueError:
            raise serializers.ValidationError(
                "Invalid date of birth"
            )
        
        # Calculate age for validation
        today = date.today()
        age = today.year - birth_date.year
        if today < birth_date.replace(year=today.year):
            age -= 1
        
        # Validate age requirements based on gender
        gender = data.get('gender')
        age_errors = []
        
        if gender == 'Male' and age < 21:
            age_errors.append('Men must be at least 21 years old')
        elif gender == 'Female' and age < 18:
            age_errors.append('Women must be at least 18 years old')
        
        if age > 40:
            age_errors.append('Maximum age for both genders is 40 years')
        
        if age_errors:
            raise serializers.ValidationError({
                'age_validation': age_errors
            })
        
        return data

    def create(self, validated_data):
        """Create user instance"""
        try:
            user = User.objects.create(**validated_data)
            return user
        except ValidationError as e:
            # Re-raise Django model validation errors as DRF errors
            if hasattr(e, 'message_dict'):
                raise serializers.ValidationError(e.message_dict)
            else:
                raise serializers.ValidationError(str(e))

    def update(self, instance, validated_data):
        """Update user instance"""
        try:
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            
            instance.save()
            return instance
        except ValidationError as e:
            # Re-raise Django model validation errors as DRF errors
            if hasattr(e, 'message_dict'):
                raise serializers.ValidationError(e.message_dict)
            else:
                raise serializers.ValidationError(str(e))


class UserStatsSerializer(serializers.Serializer):
    """Serializer for user statistics"""
    
    total_users = serializers.IntegerField()
    male_count = serializers.IntegerField()
    female_count = serializers.IntegerField()
    avg_age = serializers.FloatField()
    min_age = serializers.IntegerField()
    max_age = serializers.IntegerField()


class AgeDistributionSerializer(serializers.Serializer):
    """Serializer for age distribution data"""
    
    age_range = serializers.CharField()
    count = serializers.IntegerField()


class AgeValidationSerializer(serializers.Serializer):
    """Serializer for age validation request/response"""
    
    year = serializers.CharField(required=True)
    month = serializers.CharField(required=True)
    day = serializers.CharField(required=True)
    gender = serializers.ChoiceField(choices=User.GENDER_CHOICES, required=True)
    
    # Response fields
    age = serializers.IntegerField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    errors = serializers.ListField(
        child=serializers.CharField(),
        read_only=True
    )
    age_requirements = serializers.DictField(read_only=True)