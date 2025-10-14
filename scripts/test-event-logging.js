const mongoose = require('mongoose');
const Event = require('../server/models/Event');
const EventService = require('../server/services/EventService');
require('dotenv').config();

async function testEventLogging() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm');
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing Event Model...');
    
    // Test 1: Create a test event
    console.log('Creating test event...');
    const testEvent = new Event({
      eventType: 'LOGIN',
      resourceType: 'AUTH',
      resourceId: 'test-user-123',
      userId: new mongoose.Types.ObjectId(),
      userName: 'Test User',
      userEmail: 'test@example.com',
      description: 'Test login event',
      details: {
        loginMethod: 'password',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        ipAddress: '127.0.0.1'
      },
      status: 'SUCCESS',
      severity: 'LOW'
    });

    const savedEvent = await testEvent.save();
    console.log('✅ Test event created:', savedEvent.eventId);

    // Test 2: Test EventService methods
    console.log('\n🧪 Testing EventService...');
    
    const mockRequest = {
      sessionID: 'test-session-123',
      get: (header) => header === 'User-Agent' ? 'Test User Agent' : undefined,
      ip: '127.0.0.1'
    };

    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      name: 'Test User',
      role: 'user'
    };

    // Test login logging
    console.log('Testing login logging...');
    const loginEvent = await EventService.logLogin(mockUser, mockRequest);
    console.log('✅ Login event logged:', loginEvent.eventId);

    // Test create logging
    console.log('Testing create logging...');
    const createEvent = await EventService.logCreate(
      'CONTRACTOR',
      'contractor-123',
      mockUser,
      mockRequest,
      { name: 'Test Contractor', city: 'Tel Aviv' }
    );
    console.log('✅ Create event logged:', createEvent.eventId);

    // Test update logging
    console.log('Testing update logging...');
    const updateEvent = await EventService.logUpdate(
      'CONTRACTOR',
      'contractor-123',
      mockUser,
      mockRequest,
      { name: 'Test Contractor', city: 'Tel Aviv' },
      { name: 'Test Contractor Updated', city: 'Jerusalem' }
    );
    console.log('✅ Update event logged:', updateEvent.eventId);

    // Test search logging
    console.log('Testing search logging...');
    const searchEvent = await EventService.logSearch(
      mockUser,
      mockRequest,
      { query: 'test', filters: { city: 'Tel Aviv' } },
      5
    );
    console.log('✅ Search event logged:', searchEvent.eventId);

    // Test 3: Query events
    console.log('\n🧪 Testing Event Queries...');
    
    const events = await Event.find().sort({ timestamp: -1 }).limit(5);
    console.log(`✅ Found ${events.length} events`);

    // Test 4: Test statistics
    console.log('\n🧪 Testing Statistics...');
    
    const stats = await EventService.getSystemStats(7);
    console.log('✅ System stats:', {
      totalEvents: stats.totalEvents,
      uniqueUsers: stats.uniqueUsers
    });

    // Test 5: Test user activity
    console.log('\n🧪 Testing User Activity...');
    
    const userActivity = await EventService.getUserActivitySummary(mockUser._id, 30);
    console.log('✅ User activity:', userActivity);

    console.log('\n🎉 All tests passed successfully!');
    console.log('\n📊 Event Logging Infrastructure Summary:');
    console.log('- Event Model: ✅ Working');
    console.log('- EventService: ✅ Working');
    console.log('- Database Operations: ✅ Working');
    console.log('- Statistics: ✅ Working');
    console.log('- User Activity: ✅ Working');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testEventLogging();