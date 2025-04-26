const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const phoneNumberSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  activatedAt: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  activationCode: {
    type: String,
    required: [true, 'Activation code is required']
  },
  phoneNumbers: [phoneNumberSchema],
  maxPhoneNumbers: {
    type: Number,
    default: 3 // Default maximum phone numbers per user
  },
  activationExpiry: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ username: 1 });
userSchema.index({ 'phoneNumbers.number': 1 });

// Hash activation code before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('activationCode')) {
    const salt = await bcrypt.genSalt(10);
    this.activationCode = await bcrypt.hash(this.activationCode, salt);
  }
  next();
});

// Check if user is active and not expired
userSchema.methods.isValidUser = function() {
  return this.isActive && this.activationExpiry > Date.now();
};

// Check if phone number limit is reached
userSchema.methods.canAddPhoneNumber = function() {
  return this.phoneNumbers.length < this.maxPhoneNumbers;
};

// Verify activation code
userSchema.methods.matchActivationCode = async function(enteredCode) {
  return await bcrypt.compare(enteredCode, this.activationCode);
};

// Generate JWT Token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      username: this.username
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpire
    }
  );
};

// Add phone number to user
userSchema.methods.addPhoneNumber = async function(phoneNumber) {
  if (!this.canAddPhoneNumber()) {
    throw new Error('Maximum phone numbers limit reached');
  }

  if (this.phoneNumbers.some(phone => phone.number === phoneNumber)) {
    throw new Error('Phone number already registered');
  }

  this.phoneNumbers.push({ number: phoneNumber });
  await this.save();
};

// Remove phone number from user
userSchema.methods.removePhoneNumber = async function(phoneNumber) {
  const phoneIndex = this.phoneNumbers.findIndex(phone => phone.number === phoneNumber);
  if (phoneIndex === -1) {
    throw new Error('Phone number not found');
  }

  this.phoneNumbers.splice(phoneIndex, 1);
  await this.save();
};

// Extend activation period
userSchema.methods.extendActivation = async function(days) {
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + days);
  this.activationExpiry = newExpiry;
  await this.save();
};

// Static method to check if phone number exists
userSchema.statics.isPhoneNumberRegistered = async function(phoneNumber) {
  const user = await this.findOne({ 'phoneNumbers.number': phoneNumber });
  return !!user;
};

module.exports = mongoose.model('User', userSchema);
