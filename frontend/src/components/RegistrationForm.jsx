// src/components/RegistrationForm.jsx
import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, User, MapPin, Scale, Star } from 'lucide-react';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: {
      year: '',
      month: '',
      day: ''
    },
    timeOfBirth: {
      hour: '',
      minute: ''
    },
    birthPlace: '',
    gender: '',
    height: '',
    weight: '',
    astrological_sign: ''
  });

  const [errors, setErrors] = useState({});
  const [ageValidation, setAgeValidation] = useState('');

  // Generate years (current year - 80 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 81 }, (_, i) => currentYear - i);
  
  // Generate months
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Generate days
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Generate hours (24-hour format)
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  // Generate minutes
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // Height options in feet/inches and cm
  const heightOptions = [
    '4ft 0in / 122 cms',
    '4ft 1in / 124 cms',
    '4ft 2in / 127 cms',
    '4ft 3in / 130 cms',
    '4ft 4in / 132 cms',
    '4ft 5in / 135 cms',
    '4ft 6in / 137 cms',
    '4ft 7in / 140 cms',
    '4ft 8in / 142 cms',
    '4ft 9in / 145 cms',
    '4ft 10in / 147 cms',
    '4ft 11in / 150 cms',
    '5ft 0in / 152 cms',
    '5ft 1in / 155 cms',
    '5ft 2in / 157 cms',
    '5ft 3in / 160 cms',
    '5ft 4in / 162 cms',
    '5ft 5in / 165 cms',
    '5ft 6in / 168 cms',
    '5ft 7in / 170 cms',
    '5ft 8in / 173 cms',
    '5ft 9in / 175 cms',
    '5ft 10in / 178 cms',
    '5ft 11in / 180 cms',
    '6ft 0in / 183 cms',
    '6ft 1in / 185 cms',
    '6ft 2in / 188 cms',
    '6ft 3in / 191 cms',
    '6ft 4in / 193 cms'
  ];

  // Astrological signs
  const astrologicalSigns = [
    'Aries (मेष)',
    'Taurus (वृषभ)',
    'Gemini (मिथुन)',
    'Cancer (कर्क)',
    'Leo (सिंह)',
    'Virgo (कन्या)',
    'Libra (तुला)',
    'Scorpio (वृश्चिक)',
    'Sagittarius (धनु)',
    'Capricorn (मकर)',
    'Aquarius (कुम्भ)',
    'Pisces (मीन)'
  ];

  // Calculate age and validate
  useEffect(() => {
    const { year, month, day } = formData.dateOfBirth;
    if (year && month && day) {
      const birthDate = new Date(year, parseInt(month) - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Validation logic based on gender and age
      if (formData.gender === 'Male' && age < 21) {
        setAgeValidation('Men must be at least 21 years old');
      } else if (formData.gender === 'Female' && age < 18) {
        setAgeValidation('Women must be at least 18 years old');
      } else if (age > 40) {
        setAgeValidation('Maximum age for both genders is 40 years. If above 40, please visit our other site.');
      } else {
        setAgeValidation('');
      }
    }
  }, [formData.dateOfBirth, formData.gender]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.dateOfBirth.year || !formData.dateOfBirth.month || !formData.dateOfBirth.day) {
      newErrors.dateOfBirth = 'Complete date of birth is required';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender selection is required';
    }

    if (ageValidation) {
      newErrors.ageValidation = ageValidation;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Registration successful!');
        // Reset form or redirect
        setFormData({
          fullName: '',
          dateOfBirth: { year: '', month: '', day: '' },
          timeOfBirth: { hour: '', minute: '' },
          birthPlace: '',
          gender: '',
          height: '',
          weight: '',
          astrological_sign: ''
        });
      } else {
        alert('Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
          <div className="text-center">
            <div className="text-white font-bold text-lg">LOGO</div>
            <div className="flex justify-center mt-2 space-x-4 text-sm text-purple-100">
              <span className="border-b-2 border-white pb-1">Personal Details</span>
              <span>Education</span>
              <span>Family Details</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-sm mb-6">
            Please provide us with your basic personal details.
          </p>

          {/* Full Name */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              <User className="inline w-4 h-4 mr-1" />
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Enter Full Name"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.fullName && (
              <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Date of Birth
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={formData.dateOfBirth.year}
                onChange={(e) => handleInputChange('dateOfBirth.year', e.target.value)}
                className={`p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                  errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Year</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={formData.dateOfBirth.month}
                onChange={(e) => handleInputChange('dateOfBirth.month', e.target.value)}
                className={`p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                  errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Month</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              <select
                value={formData.dateOfBirth.day}
                onChange={(e) => handleInputChange('dateOfBirth.day', e.target.value)}
                className={`p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                  errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Day</option>
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            {errors.dateOfBirth && (
              <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>
            )}
          </div>

          {/* Time of Birth */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Time of Birth
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={formData.timeOfBirth.hour}
                onChange={(e) => handleInputChange('timeOfBirth.hour', e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Hour</option>
                {hours.map(hour => (
                  <option key={hour} value={hour}>{hour}</option>
                ))}
              </select>
              <select
                value={formData.timeOfBirth.minute}
                onChange={(e) => handleInputChange('timeOfBirth.minute', e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Minute</option>
                {minutes.map(minute => (
                  <option key={minute} value={minute}>{minute}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Birth Place */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              Birth Place
            </label>
            <input
              type="text"
              value={formData.birthPlace}
              onChange={(e) => handleInputChange('birthPlace', e.target.value)}
              placeholder="Enter Birth Place"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                errors.gender ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Male/Female</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            {errors.gender && (
              <p className="text-red-500 text-xs mt-1">{errors.gender}</p>
            )}
          </div>

          {/* Age Validation Message */}
          {ageValidation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">{ageValidation}</p>
              {ageValidation.includes('21 Years') && (
                <p className="text-blue-600 text-xs mt-1">• Men - 21 Years</p>
              )}
              {ageValidation.includes('18 Years') && (
                <p className="text-blue-600 text-xs mt-1">• Women - 18 Years</p>
              )}
            </div>
          )}

          {/* Height */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Height
            </label>
            <select
              value={formData.height}
              onChange={(e) => handleInputChange('height', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Feet / cms</option>
              {heightOptions.map(height => (
                <option key={height} value={height}>{height}</option>
              ))}
            </select>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              <Scale className="inline w-4 h-4 mr-1" />
              Weight
            </label>
            <select
              value={formData.weight}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">KG</option>
              {Array.from({ length: 151 }, (_, i) => i + 30).map(weight => (
                <option key={weight} value={weight}>{weight} kg</option>
              ))}
            </select>
          </div>

          {/* Astrological Sign */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              <Star className="inline w-4 h-4 mr-1" />
              Astrological Sign (Rashi)
            </label>
            <select
              value={formData.astrological_sign}
              onChange={(e) => handleInputChange('astrological_sign', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select option</option>
              {astrologicalSigns.map(sign => (
                <option key={sign} value={sign}>{sign}</option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!!ageValidation}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              ageValidation 
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
            }`}
          >
            Save and Next
          </button>

          {errors.ageValidation && (
            <p className="text-red-500 text-xs text-center">{errors.ageValidation}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;