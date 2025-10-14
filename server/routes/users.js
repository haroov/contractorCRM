const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Users endpoint - Session ID:', req.sessionId);
    console.log('🔍 Users endpoint - User:', req.user);
    console.log('🔍 Users endpoint - Session user:', req.session?.user);
    
    const users = await User.find({}).select('-googleId').sort({ createdAt: -1 });
    console.log('✅ Found users:', users.length);
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

// Removed temp user creation endpoint - users must authenticate via Google OAuth

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('Creating user with request body:', req.body);

    const { name, email, phone, position, role, isActive } = req.body;

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
      lastLogin: null // Explicitly set to null for pending users
    };

    // Don't include googleId field at all for new users
    // It will be added when user authenticates via Google

    // Only add phone if it's provided and not empty
    if (phone && phone.trim() !== '') {
      userData.phone = phone.trim();
    }

    // Only add position if it's provided and not empty
    if (position && position.trim() !== '') {
      userData.position = position.trim();
    }

    console.log('Final user data:', userData);

    const user = new User(userData);
    await user.save();

    await req.logEvent('users.create', {
      entity: { type: 'user', id: user._id.toString(), email: user.email },
      data: { name: user.name, role: user.role, isActive: user.isActive },
      result: 'success'
    });

    console.log('User created successfully:', user._id);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    await req.logEvent('users.create', {
      result: 'failure',
      error: error.message,
      data: { email: req.body?.email }
    });
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// Update user (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, position, role, isActive } = req.body;

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
    if (position !== undefined) updateData.position = position || undefined;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-googleId');

    if (!user) {
      await req.logEvent('users.update', {
        result: 'failure',
        error: 'not_found',
        entity: { type: 'user', id: req.params.id }
      });
      return res.status(404).json({ error: 'User not found' });
    }

    await req.logEvent('users.update', {
      entity: { type: 'user', id: user._id.toString(), email: user.email },
      data: updateData,
      result: 'success'
    });
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    await req.logEvent('users.update', {
      result: 'failure',
      error: error.message,
      entity: { type: 'user', id: req.params.id }
    });
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
      await req.logEvent('users.delete', {
        result: 'failure',
        error: 'not_found',
        entity: { type: 'user', id: req.params.id }
      });
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User deleted successfully:', user.email);
    await req.logEvent('users.delete', {
      entity: { type: 'user', id: user._id.toString(), email: user.email },
      result: 'success'
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    console.error('Error details:', error.message);
    await req.logEvent('users.delete', {
      result: 'failure',
      error: error.message,
      entity: { type: 'user', id: req.params.id }
    });
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

    await req.logEvent('users.toggle_active', {
      entity: { type: 'user', id: user._id.toString(), email: user.email },
      data: { isActive: user.isActive },
      result: 'success'
    });

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    await req.logEvent('users.toggle_active', {
      result: 'failure',
      error: error.message,
      entity: { type: 'user', id: req.params.id }
    });
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

module.exports = router;
