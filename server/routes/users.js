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
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email: email.toLowerCase(),
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
      // Note: For manually created users, we don't have googleId
      // They would need to login via Google to get a googleId
    });

    await user.save();
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;

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
    // Prevent deleting yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
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
