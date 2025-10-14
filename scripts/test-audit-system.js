#!/usr/bin/env node

/**
 * Script to test the audit logging system
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AuditLog = require('../server/models/AuditLog');
const auditService = require('../server/services/auditService');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function testAuditCreation() {
  console.log('\n📝 Testing audit log creation...');
  
  try {
    // Test creating a simple audit log
    const testLog = await AuditLog.createLog({
      eventType: 'AUTH_LOGIN',
      userEmail: 'test@example.com',
      userName: 'Test User',
      userRole: 'user',
      timestamp: new Date(),
      action: 'User login test',
      description: 'Test user logged in successfully',
      deviceInfo: {
        userAgent: 'Mozilla/5.0 Test',
        ip: '127.0.0.1',
        browser: 'Chrome 120',
        os: 'Windows 10',
        device: 'desktop'
      },
      status: 'SUCCESS',
      severity: 'LOW',
      tags: ['test', 'authentication']
    });
    
    console.log('✅ Audit log created:', testLog._id);
    return testLog;
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    return null;
  }
}

async function testEventEmitter() {
  console.log('\n📡 Testing event emitter...');
  
  try {
    // Test emitting login event
    auditService.emit('auth:login', {
      userId: new mongoose.Types.ObjectId(),
      email: 'event@example.com',
      name: 'Event Test User',
      role: 'user',
      sessionId: 'test-session-123',
      deviceInfo: {
        userAgent: 'Test Agent',
        ip: '192.168.1.1',
        browser: 'Firefox',
        os: 'Linux',
        device: 'desktop'
      },
      loginMethod: 'email'
    });
    
    // Wait for async operation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if event was logged
    const eventLog = await AuditLog.findOne({ 
      userEmail: 'event@example.com',
      eventType: 'AUTH_LOGIN'
    }).sort({ timestamp: -1 });
    
    if (eventLog) {
      console.log('✅ Event successfully logged:', eventLog._id);
    } else {
      console.log('⚠️ Event was not logged');
    }
    
    return eventLog;
  } catch (error) {
    console.error('❌ Error testing event emitter:', error);
    return null;
  }
}

async function testDataEvents() {
  console.log('\n💾 Testing data operation events...');
  
  try {
    const testUserId = new mongoose.Types.ObjectId();
    
    // Test create event
    auditService.emit('data:created', {
      userId: testUserId,
      userEmail: 'admin@example.com',
      resourceType: 'Project',
      resourceId: new mongoose.Types.ObjectId().toString(),
      resourceName: 'Test Project',
      collection: 'projects',
      data: {
        projectName: 'Test Project',
        status: 'active'
      }
    });
    
    // Test update event
    auditService.emit('data:updated', {
      userId: testUserId,
      userEmail: 'admin@example.com',
      resourceType: 'Project',
      resourceId: new mongoose.Types.ObjectId().toString(),
      resourceName: 'Test Project',
      collection: 'projects',
      oldData: { status: 'active' },
      newData: { status: 'completed' }
    });
    
    // Test delete event
    auditService.emit('data:deleted', {
      userId: testUserId,
      userEmail: 'admin@example.com',
      resourceType: 'Project',
      resourceId: new mongoose.Types.ObjectId().toString(),
      resourceName: 'Test Project',
      collection: 'projects',
      data: { projectName: 'Test Project' }
    });
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Query the created logs
    const dataLogs = await AuditLog.find({
      userEmail: 'admin@example.com',
      eventType: { $in: ['DATA_CREATE', 'DATA_UPDATE', 'DATA_DELETE'] }
    }).sort({ timestamp: -1 }).limit(3);
    
    console.log(`✅ Created ${dataLogs.length} data operation logs`);
    return dataLogs;
  } catch (error) {
    console.error('❌ Error testing data events:', error);
    return [];
  }
}

async function testUserActivity() {
  console.log('\n👤 Testing user activity retrieval...');
  
  try {
    const testUserId = new mongoose.Types.ObjectId();
    
    // Create some test activity
    for (let i = 0; i < 5; i++) {
      await AuditLog.createLog({
        eventType: ['DATA_VIEW', 'DATA_CREATE', 'DATA_UPDATE'][i % 3],
        userId: testUserId,
        userEmail: 'activity@example.com',
        timestamp: new Date(Date.now() - i * 60000), // Each minute apart
        action: `Test action ${i}`,
        description: `Test activity ${i}`,
        status: 'SUCCESS',
        severity: 'LOW'
      });
    }
    
    // Retrieve user activity
    const activity = await AuditLog.getUserActivity(testUserId, {
      limit: 10
    });
    
    console.log(`✅ Retrieved ${activity.length} activity logs for user`);
    return activity;
  } catch (error) {
    console.error('❌ Error testing user activity:', error);
    return [];
  }
}

async function testAnalytics() {
  console.log('\n📊 Testing analytics...');
  
  try {
    const analytics = await AuditLog.getAnalytics({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      groupBy: 'eventType'
    });
    
    console.log('✅ Analytics by event type:');
    analytics.forEach(item => {
      console.log(`  - ${item._id}: ${item.count} events`);
    });
    
    return analytics;
  } catch (error) {
    console.error('❌ Error testing analytics:', error);
    return [];
  }
}

async function testResourceHistory() {
  console.log('\n📜 Testing resource history...');
  
  try {
    const resourceId = new mongoose.Types.ObjectId().toString();
    
    // Create some history for a resource
    for (let i = 0; i < 3; i++) {
      await AuditLog.createLog({
        eventType: ['PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_VIEW'][i],
        userId: new mongoose.Types.ObjectId(),
        userEmail: `user${i}@example.com`,
        timestamp: new Date(Date.now() - i * 3600000), // Each hour apart
        action: ['Created', 'Updated', 'Viewed'][i],
        description: `${['Created', 'Updated', 'Viewed'][i]} test project`,
        resourceType: 'Project',
        resourceId: resourceId,
        resourceName: 'Test Project',
        status: 'SUCCESS',
        severity: 'LOW'
      });
    }
    
    // Get resource history
    const history = await AuditLog.getResourceHistory('Project', resourceId, {
      limit: 10
    });
    
    console.log(`✅ Retrieved ${history.length} history logs for resource`);
    return history;
  } catch (error) {
    console.error('❌ Error testing resource history:', error);
    return [];
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Delete test audit logs (be careful with this in production!)
    const result = await AuditLog.deleteMany({
      $or: [
        { userEmail: { $in: ['test@example.com', 'event@example.com', 'activity@example.com'] } },
        { userEmail: { $regex: /^user\d+@example\.com$/ } },
        { tags: 'test' }
      ]
    });
    
    console.log(`✅ Deleted ${result.deletedCount} test audit logs`);
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting Audit System Tests');
  console.log('================================\n');
  
  try {
    // Connect to database
    await connectDB();
    
    // Run tests
    await testAuditCreation();
    await testEventEmitter();
    await testDataEvents();
    await testUserActivity();
    await testAnalytics();
    await testResourceHistory();
    
    // Cleanup
    await cleanupTestData();
    
    console.log('\n================================');
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run tests
runTests();

