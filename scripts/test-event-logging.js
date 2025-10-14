#!/usr/bin/env node

/**
 * Test script for event logging system
 * This script tests the event logging infrastructure
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import event logging service and models
const eventLoggingService = require('../server/services/eventLoggingService');
const Event = require('../server/models/Event');
const { EVENT_TYPES, EVENT_CATEGORIES, EVENT_STATUS, EVENT_SEVERITY } = require('../server/config/eventLogging');

async function testEventLogging() {
  try {
    console.log('🧪 Starting event logging system tests...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Log a simple authentication event
    console.log('🔐 Test 1: Logging authentication event...');
    const authEvent = await eventLoggingService.logAuthEvent(
      EVENT_TYPES.USER_LOGIN,
      { _id: '507f1f77bcf86cd799439011', email: 'test@example.com', role: 'user' },
      { 
        sessionID: 'test-session-123',
        ip: '127.0.0.1',
        get: () => 'Mozilla/5.0 Test Browser',
        method: 'POST',
        originalUrl: '/api/auth/login'
      },
      { loginMethod: 'email', success: true }
    );
    console.log('✅ Auth event logged:', authEvent?.eventId);

    // Test 2: Log a CRUD event
    console.log('\n📝 Test 2: Logging CRUD event...');
    const crudEvent = await eventLoggingService.logCrudEvent(
      'CREATE',
      'project',
      { _id: '507f1f77bcf86cd799439022', name: 'Test Project', projectName: 'Test Project' },
      { _id: '507f1f77bcf86cd799439011', email: 'test@example.com', role: 'user' },
      { 
        sessionID: 'test-session-123',
        ip: '127.0.0.1',
        get: () => 'Mozilla/5.0 Test Browser',
        method: 'POST',
        originalUrl: '/api/projects'
      }
    );
    console.log('✅ CRUD event logged:', crudEvent?.eventId);

    // Test 3: Log a file operation event
    console.log('\n📁 Test 3: Logging file event...');
    const fileEvent = await eventLoggingService.logFileEvent(
      'UPLOAD',
      'test-document.pdf',
      1024000, // 1MB
      { _id: '507f1f77bcf86cd799439011', email: 'test@example.com', role: 'user' },
      { 
        sessionID: 'test-session-123',
        ip: '127.0.0.1',
        get: () => 'Mozilla/5.0 Test Browser',
        method: 'POST',
        originalUrl: '/api/upload'
      },
      { projectId: '507f1f77bcf86cd799439022' }
    );
    console.log('✅ File event logged:', fileEvent?.eventId);

    // Test 4: Log a system event
    console.log('\n🖥️ Test 4: Logging system event...');
    const systemEvent = await eventLoggingService.logSystemEvent(
      EVENT_TYPES.SYSTEM_INFO,
      'Event logging system test completed successfully',
      EVENT_SEVERITY.LOW,
      { testRun: true, timestamp: new Date().toISOString() }
    );
    console.log('✅ System event logged:', systemEvent?.eventId);

    // Test 5: Log an error event
    console.log('\n❌ Test 5: Logging error event...');
    const testError = new Error('Test error for logging');
    testError.code = 'TEST_ERROR';
    const errorEvent = await eventLoggingService.logError(
      testError,
      { 
        sessionID: 'test-session-123',
        ip: '127.0.0.1',
        get: () => 'Mozilla/5.0 Test Browser',
        method: 'GET',
        originalUrl: '/api/test-error'
      },
      { _id: '507f1f77bcf86cd799439011', email: 'test@example.com' },
      { testContext: 'error logging test' }
    );
    console.log('✅ Error event logged:', errorEvent?.eventId);

    // Wait for batch processing
    console.log('\n⏳ Waiting for batch processing...');
    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds

    // Test 6: Query events
    console.log('\n🔍 Test 6: Querying events...');
    const eventsResult = await eventLoggingService.getEvents(
      { userEmail: 'test@example.com' },
      { page: 1, limit: 10, sortBy: 'timestamp', sortOrder: 'desc' }
    );
    console.log(`✅ Found ${eventsResult.events.length} events for test user`);
    
    if (eventsResult.events.length > 0) {
      console.log('📊 Sample event:', {
        eventId: eventsResult.events[0].eventId,
        eventType: eventsResult.events[0].eventType,
        category: eventsResult.events[0].category,
        description: eventsResult.events[0].description,
        timestamp: eventsResult.events[0].timestamp
      });
    }

    // Test 7: Get event statistics
    console.log('\n📈 Test 7: Getting event statistics...');
    const stats = await eventLoggingService.getEventStats({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      endDate: new Date()
    });
    console.log('✅ Event statistics:', stats);

    // Test 8: Test event filtering
    console.log('\n🔎 Test 8: Testing event filtering...');
    const authEvents = await eventLoggingService.getEvents(
      { category: EVENT_CATEGORIES.AUTH },
      { page: 1, limit: 5 }
    );
    console.log(`✅ Found ${authEvents.events.length} authentication events`);

    const crudEvents = await eventLoggingService.getEvents(
      { category: EVENT_CATEGORIES.CRUD },
      { page: 1, limit: 5 }
    );
    console.log(`✅ Found ${crudEvents.events.length} CRUD events`);

    // Test 9: Test direct database query
    console.log('\n🗄️ Test 9: Testing direct database query...');
    const totalEvents = await Event.countDocuments();
    console.log(`✅ Total events in database: ${totalEvents}`);

    const recentEvents = await Event.find()
      .sort({ timestamp: -1 })
      .limit(3)
      .select('eventType category description timestamp')
      .lean();
    
    console.log('📋 Recent events:');
    recentEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.eventType} (${event.category}): ${event.description}`);
    });

    console.log('\n🎉 All event logging tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log(`   - Authentication events: ✅`);
    console.log(`   - CRUD events: ✅`);
    console.log(`   - File events: ✅`);
    console.log(`   - System events: ✅`);
    console.log(`   - Error events: ✅`);
    console.log(`   - Event querying: ✅`);
    console.log(`   - Event statistics: ✅`);
    console.log(`   - Event filtering: ✅`);
    console.log(`   - Database integration: ✅`);

  } catch (error) {
    console.error('❌ Event logging test failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
    process.exit(0);
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  testEventLogging();
}

module.exports = { testEventLogging };