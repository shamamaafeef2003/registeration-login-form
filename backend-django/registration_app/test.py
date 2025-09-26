# registration_app/tests.py
from django.test import TestCase
from rest_framework.test import APITestCase
from django.urls import reverse
from .models import User

class UserModelTests(TestCase):
    def test_user_creation(self):
        user = User.objects.create(
            full_name="John Doe",
            birth_year="1995",
            birth_month="06",
            birth_day="15",
            gender="Male"
        )
        self.assertEqual(user.full_name, "John Doe")
        self.assertTrue(user.age >= 25)

    def test_age_calculation(self):
        user = User(
            full_name="Jane Doe",
            birth_year="2000",
            birth_month="01",
            birth_day="01",
            gender="Female"
        )
        age = user.calculate_age()
        self.assertTrue(age >= 23)

    def test_age_validation_male(self):
        user = User(
            full_name="Young Male",
            birth_year="2010",
            birth_month="01",
            birth_day="01",
            gender="Male"
        )
        errors = user.validate_age_requirements()
        self.assertIn('Men must be at least 21 years old', errors)

    def test_age_validation_female(self):
        user = User(
            full_name="Young Female",
            birth_year="2010",
            birth_month="01",
            birth_day="01",
            gender="Female"
        )
        errors = user.validate_age_requirements()
        self.assertIn('Women must be at least 18 years old', errors)

class UserAPITests(APITestCase):
    def test_register_user(self):
        url = reverse('user-list')
        data = {
            'full_name': 'Jane Doe',
            'birth_year': '1998',
            'birth_month': '03',
            'birth_day': '20',
            'gender': 'Female'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().full_name, 'Jane Doe')

    def test_register_underage_user(self):
        url = reverse('user-list')
        data = {
            'full_name': 'Young User',
            'birth_year': '2010',
            'birth_month': '01',
            'birth_day': '01',
            'gender': 'Male'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 400)

    def test_get_users_list(self):
        User.objects.create(
            full_name="Test User",
            birth_year="1995",
            birth_month="06",
            birth_day="15",
            gender="Male"
        )
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)

    def test_health_check(self):
        url = reverse('health-check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'OK')

    def test_validate_age(self):
        url = reverse('validate-age')
        data = {
            'year': '1995',
            'month': '06',
            'day': '15',
            'gender': 'Male'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_valid'])