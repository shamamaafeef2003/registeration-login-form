// server.js - Node.js Backend with Express
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/registration_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    year: {
      type: String,
      required: true
    },
    month: {
      type: String,
      required: true
    },
    day: {
      type: String,
      required: true
    }
  },
  timeOfBirth: {
    hour: String,
    minute: String
  },
  birthPlace: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female']
  },
  height: String,
  weight: String,
  astrological_sign: String,
  age: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive', 'pending']
  }
});

// Create index for faster queries
userSchema.index({ fullName: 1, gender: 1 });

const User = mongoose.model('User', userSchema);

// Utility Functions
const calculateAge = (year, month, day) => {
  const birthDate = new Date(year, parseInt(month) - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const validateAge = (age, gender) => {
  const errors = [];
  
  if (gender === 'Male' && age < 21) {
    errors.push('Men must be at least 21 years old');
  }
  
  if (gender === 'Female' && age < 18) {
    errors.push('Women must be at least 18 years old');
  }
  
  if (age > 40) {
    errors.push('Maximum age for both genders is 40 years. Please visit our other site for registration.');
  }
  
  return errors;
};

// Validation middleware
const registrationValidation = [
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
    
  body('dateOfBirth.year')
    .notEmpty()
    .withMessage('Birth year is required')
    .isInt({ min: 1940, max: new Date().getFullYear() })
    .withMessage('Please enter a valid birth year'),
    
  body('dateOfBirth.month')
    .notEmpty()
    .withMessage('Birth month is required')
    .isIn(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'])
    .withMessage('Please select a valid month'),
    
  body('dateOfBirth.day')
    .notEmpty()
    .withMessage('Birth day is required')
    .isInt({ min: 1, max: 31 })
    .withMessage('Please enter a valid day'),
    
  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['Male', 'Female'])
    .withMessage('Gender must be Male or Female'),
    
  body('birthPlace')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Birth place must be less than 100 characters'),
    
  body('timeOfBirth.hour')
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage('Hour must be between 0 and 23'),
    
  body('timeOfBirth.minute')
    .optional()
    .isInt({ min: 0, max: 59 })
    .withMessage('Minute must be between 0 and 59')
];

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get all users (for admin purposes)
app.get('/api/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, gender, minAge, maxAge } = req.query;
    
    const query = {};
    if (gender) query.gender = gender;
    if (minAge || maxAge) {
      query.age = {};
      if (minAge) query.age.$gte = parseInt(minAge);
      if (maxAge) query.age.$lte = parseInt(maxAge);
    }
    
    const users = await User.find(query)
      .select('-__v')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
      
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalUsers: total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch users'
    });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch user'
    });
  }
});

// Register new user
app.post('/api/register', registrationValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      fullName, 
      dateOfBirth, 
      timeOfBirth, 
      birthPlace, 
      gender, 
      height, 
      weight, 
      astrological_sign 
    } = req.body;

    // Calculate age
    const age = calculateAge(dateOfBirth.year, dateOfBirth.month, dateOfBirth.day);
    
    // Validate age based on gender
    const ageValidationErrors = validateAge(age, gender);
    if (ageValidationErrors.length > 0) {
      return res.status(400).json({
        error: 'Age validation failed',
        details: ageValidationErrors
      });
    }

    // Check if user already exists (by name and birth date)
    const existingUser = await User.findOne({
      fullName: fullName.trim(),
      'dateOfBirth.year': dateOfBirth.year,
      'dateOfBirth.month': dateOfBirth.month,
      'dateOfBirth.day': dateOfBirth.day
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'A user with the same name and date of birth already exists'
      });
    }

    // Create new user
    const newUser = new User({
      fullName: fullName.trim(),
      dateOfBirth,
      timeOfBirth,
      birthPlace: birthPlace?.trim(),
      gender,
      height,
      weight,
      astrological_sign,
      age
    });

    const savedUser = await newUser.save();

    // Return success response with user data (excluding sensitive info)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: savedUser._id,
        fullName: savedUser.fullName,
        dateOfBirth: savedUser.dateOfBirth,
        gender: savedUser.gender,
        age: savedUser.age,
        createdAt: savedUser.createdAt,
        status: savedUser.status
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Database validation failed',
        details: validationErrors
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Registration failed. Please try again.'
    });
  }
});

// Update user
app.put('/api/users/:id', registrationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      fullName, 
      dateOfBirth, 
      timeOfBirth, 
      birthPlace, 
      gender, 
      height, 
      weight, 
      astrological_sign 
    } = req.body;

    // Calculate new age
    const age = calculateAge(dateOfBirth.year, dateOfBirth.month, dateOfBirth.day);
    
    // Validate age based on gender
    const ageValidationErrors = validateAge(age, gender);
    if (ageValidationErrors.length > 0) {
      return res.status(400).json({
        error: 'Age validation failed',
        details: ageValidationErrors
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        fullName: fullName.trim(),
        dateOfBirth,
        timeOfBirth,
        birthPlace: birthPlace?.trim(),
        gender,
        height,
        weight,
        astrological_sign,
        age
      },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Database validation failed',
        details: validationErrors
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Update failed. Please try again.'
    });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: deletedUser._id,
        fullName: deletedUser.fullName
      }
    });

  } catch (error) {
    console.error('Delete error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Deletion failed. Please try again.'
    });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          maleCount: { 
            $sum: { $cond: [{ $eq: ['$gender', 'Male'] }, 1, 0] } 
          },
          femaleCount: { 
            $sum: { $cond: [{ $eq: ['$gender', 'Female'] }, 1, 0] } 
          },
          avgAge: { $avg: '$age' },
          minAge: { $min: '$age' },
          maxAge: { $max: '$age' }
        }
      }
    ]);

    const ageGroups = await User.aggregate([
      {
        $bucket: {
          groupBy: '$age',
          boundaries: [18, 25, 30, 35, 40, 45],
          default: '40+',
          output: {
            count: { $sum: 1 },
            users: { $push: '$fullName' }
          }
        }
      }
    ]);

    res.json({
      overview: stats[0] || {
        totalUsers: 0,
        maleCount: 0,
        femaleCount: 0,
        avgAge: 0,
        minAge: 0,
        maxAge: 0
      },
      ageDistribution: ageGroups
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch statistics'
    });
  }
});

// Validate date endpoint (utility)
app.post('/api/validate-age', (req, res) => {
  try {
    const { year, month, day, gender } = req.body;
    
    if (!year || !month || !day || !gender) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['year', 'month', 'day', 'gender']
      });
    }

    const age = calculateAge(year, month, day);
    const validationErrors = validateAge(age, gender);
    
    res.json({
      age,
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      ageRequirements: {
        male: 'Minimum 21 years',
        female: 'Minimum 18 years',
        maximum: 'Maximum 40 years for both'
      }
    });

  } catch (error) {
    console.error('Age validation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Age validation failed'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on the server'
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    message: `The endpoint ${req.originalUrl} does not exist`
  });
});

// Database connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   POST /api/register - Register new user`);
  console.log(`   GET  /api/users - Get all users`);
  console.log(`   GET  /api/users/:id - Get user by ID`);
  console.log(`   PUT  /api/users/:id - Update user`);
  console.log(`   DELETE /api/users/:id - Delete user`);
  console.log(`   GET  /api/stats - Get statistics`);
  console.log(`   POST /api/validate-age - Validate age`);
});

module.exports = app;