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

async function setRoeyPassword() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find the user
        const user = await User.findOne({ email: 'roey@chocoinsurance.com' });

        if (!user) {
            console.log('❌ User not found: roey@chocoinsurance.com');
            return;
        }

        console.log('✅ Found user:', user.email, 'Role:', user.role);

        // Set password (default: admin123)
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user with password
        user.password = hashedPassword;
        await user.save();

        console.log('✅ Password set successfully for:', user.email);
        console.log('📧 Email:', user.email);
        console.log('🔑 Password: admin123');
        console.log('👤 Role:', user.role);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

setRoeyPassword();
