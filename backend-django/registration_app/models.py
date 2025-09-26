# models.py - Django Models
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from datetime import date, datetime
import re

class User(models.Model):
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('pending', 'Pending'),
    ]

    # Basic Information
    full_name = models.CharField(
        max_length=100, 
        help_text="Full name of the user"
    )
    
    # Date of Birth
    birth_year = models.CharField(max_length=4)
    birth_month = models.CharField(max_length=2)
    birth_day = models.CharField(max_length=2)
    
    # Time of Birth (Optional)
    birth_hour = models.CharField(max_length=2, blank=True, null=True)
    birth_minute = models.CharField(max_length=2, blank=True, null=True)
    
    # Location and Physical Details
    birth_place = models.CharField(max_length=200, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    height = models.CharField(max_length=50, blank=True, null=True)
    weight = models.CharField(max_length=20, blank=True, null=True)
    
    # Astrological Information
    astrological_sign = models.CharField(max_length=50, blank=True, null=True)
    
    # Calculated Fields
    age = models.IntegerField(editable=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        db_table = 'registration_users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['full_name', 'gender']),
            models.Index(fields=['age']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.gender}, {self.age} years)"

    def clean(self):
        """Validate the model data"""
        errors = {}
        
        # Validate full name
        if not re.match(r'^[a-zA-Z\s]+$', self.full_name):
            errors['full_name'] = 'Full name can only contain letters and spaces'
        
        # Validate date components
        try:
            year = int(self.birth_year)
            month = int(self.birth_month)
            day = int(self.birth_day)
            
            # Check if date is valid
            birth_date = date(year, month, day)
            
            if birth_date > date.today():
                errors['birth_date'] = 'Birth date cannot be in the future'
                
        except (ValueError, TypeError):
            errors['birth_date'] = 'Invalid date of birth'
        
        # Validate time if provided
        if self.birth_hour:
            try:
                hour = int(self.birth_hour)
                if not (0 <= hour <= 23):
                    errors['birth_hour'] = 'Hour must be between 0 and 23'
            except (ValueError, TypeError):
                errors['birth_hour'] = 'Invalid hour format'
        
        if self.birth_minute:
            try:
                minute = int(self.birth_minute)
                if not (0 <= minute <= 59):
                    errors['birth_minute'] = 'Minute must be between 0 and 59'
            except (ValueError, TypeError):
                errors['birth_minute'] = 'Invalid minute format'
        
        if errors:
            raise ValidationError(errors)

    def calculate_age(self):
        """Calculate age based on birth date"""
        try:
            birth_date = date(int(self.birth_year), int(self.birth_month), int(self.birth_day))
            today = date.today()
            age = today.year - birth_date.year
            
            # Adjust if birthday hasn't occurred this year
            if today < birth_date.replace(year=today.year):
                age -= 1
                
            return age
        except (ValueError, TypeError):
            return 0

    def validate_age_requirements(self):
        """Validate age requirements based on gender"""
        age = self.calculate_age()
        errors = []
        
        if self.gender == 'Male' and age < 21:
            errors.append('Men must be at least 21 years old')
        elif self.gender == 'Female' and age < 18:
            errors.append('Women must be at least 18 years old')
        
        if age > 40:
            errors.append('Maximum age for both genders is 40 years')
        
        return errors

    def save(self, *args, **kwargs):
        """Override save to calculate age"""
        # Calculate age before saving
        self.age = self.calculate_age()
        
        # Validate age requirements
        age_errors = self.validate_age_requirements()
        if age_errors:
            raise ValidationError({'age': age_errors})
        
        # Call the parent save method
        super().save(*args, **kwargs)