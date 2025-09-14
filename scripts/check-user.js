const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User model
const userSchema = new mongoose.Schema({
    googleId: String,
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: false, minlength: 6 },
    name: { type: String, required: true },
    phone: String,
    picture: String,
    isActive: { type: Boolean, default: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function checkAndCreateUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if roey@chocoinsurance.com exists
        const user = await User.findOne({ email: 'roey@chocoinsurance.com' });

        if (user) {
            console.log('✅ User found:', {
                email: user.email,
                name: user.name,
                role: user.role,
                isActive: user.isActive,
                hasPassword: !!user.password
            });
        } else {
            console.log('❌ User not found: roey@chocoinsurance.com');
            console.log('🔧 Creating user...');

            // Create the user
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const newUser = new User({
                email: 'roey@chocoinsurance.com',
                name: 'Roey Choco',
                password: hashedPassword,
                role: 'admin',
                isActive: true
            });

            await newUser.save();
            console.log('✅ User created successfully:', {
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                password: 'admin123'
            });
        }

        // Also check all users with chocoinsurance.com domain
        const chocoUsers = await User.find({ email: /chocoinsurance\.com$/ });
        console.log('📋 All chocoinsurance.com users:');
        chocoUsers.forEach(u => {
            console.log(`  - ${u.email} (${u.name}) - Role: ${u.role}, Active: ${u.isActive}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

checkAndCreateUser();
