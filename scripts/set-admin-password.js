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

async function setAdminPassword() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find the admin user
        const adminUser = await User.findOne({ email: 'liav@chocoinsurance.com' });

        if (!adminUser) {
            console.log('❌ Admin user not found');
            return;
        }

        console.log('✅ Found admin user:', adminUser.email, 'Role:', adminUser.role);

        // Set password (default: admin123)
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user with password
        adminUser.password = hashedPassword;
        await adminUser.save();

        console.log('✅ Password set successfully for:', adminUser.email);
        console.log('📧 Email:', adminUser.email);
        console.log('🔑 Password: admin123');
        console.log('👤 Role:', adminUser.role);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

setAdminPassword();
