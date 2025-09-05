const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-googleId').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-googleId');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (admin only)
// New endpoint for creating users with temporary googleId
router.post('/create-temp', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('Creating temp user with request body:', req.body);

    const { name, email, phone, role, isActive } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user with temporary googleId
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
      googleId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Only add phone if it's provided and not empty
    if (phone && phone.trim() !== '') {
      userData.phone = phone.trim();
    }

    console.log('Final temp user data:', userData);

    const user = new User(userData);
    await user.save();

    console.log('Temp user created successfully:', user._id);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating temp user:', error);
    res.status(500).json({ error: 'Failed to create temp user', details: error.message });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('Creating user with request body:', req.body);

    const { name, email, phone, role, isActive } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user with minimal data
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
      googleId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastLogin: null // Explicitly set to null for pending users
    };

    // Only add phone if it's provided and not empty
    if (phone && phone.trim() !== '') {
      userData.phone = phone.trim();
    }

    console.log('Final user data:', userData);

    const user = new User(userData);
    await user.save();

    console.log('User created successfully:', user._id);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// Update user (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, role, isActive } = req.body;

    // Check if email is being changed and if it already exists
    if (email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone || undefined;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-googleId');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('Deleting user with ID:', req.params.id);
    console.log('Request user:', req.user);
    
    // Prevent deleting yourself (only if req.user is available)
    if (req.user && req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User deleted successfully:', user.email);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Alternative delete endpoint for testing
router.delete('/delete/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('Alternative delete - User ID:', req.params.id);
    
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User deleted successfully via alternative endpoint:', user.email);
    res.json({ message: 'User deleted successfully', user: { email: user.email, name: user.name } });
  } catch (error) {
    console.error('Error deleting user via alternative endpoint:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Toggle user active status (admin only)
router.patch('/:id/toggle-active', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Prevent deactivating yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

module.exports = router;
