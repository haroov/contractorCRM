const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: false,
    unique: false, // Changed to false to allow multiple null values
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: false,
    validate: {
      validator: function (v) {
        // Israeli mobile phone format: 05x-xxxxxxx
        // Allow empty strings and null values
        return !v || v === '' || /^05[0-9]-[0-9]{7}$/.test(v);
      },
      message: 'Phone number must be in format 05x-xxxxxxx'
    }
  },
  picture: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

module.exports = mongoose.model('User', userSchema);
