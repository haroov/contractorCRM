#!/usr/bin/env node

const mongoose = require('mongoose');
const User = require('../server/models/User');

// Connect to MongoDB using environment variable
const mongoUri = process.env.MONGODB_URI;

async function addLiavUser() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log('🔗 MongoDB URI:', mongoUri ? 'Set' : 'Not set');
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable not set');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'liav@geffen.org.il' });
    
    if (existingUser) {
      console.log('👤 User already exists:', existingUser.email);
      console.log('📝 User details:', {
        name: existingUser.name,
        role: existingUser.role,
        isActive: existingUser.isActive,
        googleId: existingUser.googleId
      });
    } else {
      // Create new user
      const newUser = new User({
        email: 'liav@geffen.org.il',
        name: 'Liav Geffen',
        role: 'admin', // Give admin role
        isActive: true,
        lastLogin: new Date()
      });

      await newUser.save();
      console.log('✅ New user created:', newUser.email);
      console.log('📝 User details:', {
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive
      });
    }

    // List all users
    console.log('\n📋 All users in database:');
    const allUsers = await User.find({}, 'email name role isActive');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Role: ${user.role}, Active: ${user.isActive}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

addLiavUser();
