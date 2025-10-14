#!/usr/bin/env node

/**
 * סקריפט לבדיקת תשתית Event Logging
 * 
 * הסקריפט בודק שכל הרכיבים של תשתית Event Logging עובדים כראוי
 */

const mongoose = require('mongoose');
const Event = require('../server/models/Event');
const EventService = require('../server/services/EventService');
const AuditService = require('../server/services/AuditService');

// הגדרות MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';

async function testEventLogging() {
  console.log('🚀 Starting Event Logging Infrastructure Test...\n');

  try {
    // חיבור ל-MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // בדיקת מודל Event
    console.log('🔍 Testing Event Model...');
    const eventSchema = Event.schema;
    console.log('✅ Event model loaded successfully');
    console.log(`   - Fields: ${Object.keys(eventSchema.paths).length}`);
    console.log(`   - Indexes: ${eventSchema.indexes().length}\n`);

    // בדיקת EventService
    console.log('🔍 Testing EventService...');
    
    // יצירת אירוע לדוגמה
    const testEvent = await EventService.logCrudAction({
      userId: new mongoose.Types.ObjectId(),
      userEmail: 'test@example.com',
      userName: 'Test User',
      action: 'CREATE',
      entityType: 'CONTRACTOR',
      entityId: new mongoose.Types.ObjectId(),
      entityName: 'Test Contractor',
      beforeData: null,
      afterData: { name: 'Test Contractor', city: 'Tel Aviv' },
      metadata: { test: true },
      description: 'Test event for infrastructure validation'
    });
    
    console.log('✅ EventService.logCrudAction() works');
    console.log(`   - Created event ID: ${testEvent._id}`);

    // בדיקת EventService.logAuthAction
    const authEvent = await EventService.logAuthAction({
      userId: new mongoose.Types.ObjectId(),
      userEmail: 'test@example.com',
      userName: 'Test User',
      action: 'LOGIN',
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent'
    });
    
    console.log('✅ EventService.logAuthAction() works');
    console.log(`   - Created auth event ID: ${authEvent._id}`);

    // בדיקת EventService.logSystemAction
    const systemEvent = await EventService.logSystemAction({
      userId: new mongoose.Types.ObjectId(),
      userEmail: 'test@example.com',
      userName: 'Test User',
      action: 'UPLOAD',
      entityType: 'FILE',
      entityId: new mongoose.Types.ObjectId(),
      entityName: 'test-file.pdf',
      metadata: { filename: 'test-file.pdf', size: 1024 }
    });
    
    console.log('✅ EventService.logSystemAction() works');
    console.log(`   - Created system event ID: ${systemEvent._id}\n`);

    // בדיקת AuditService
    console.log('🔍 Testing AuditService...');
    
    // בדיקת getAuditTrail
    const auditTrail = await AuditService.getAuditTrail('CONTRACTOR', testEvent.entityId, {
      limit: 10
    });
    console.log('✅ AuditService.getAuditTrail() works');
    console.log(`   - Found ${auditTrail.length} events in audit trail`);

    // בדיקת getFieldHistory
    const fieldHistory = await AuditService.getFieldHistory('CONTRACTOR', testEvent.entityId, 'name');
    console.log('✅ AuditService.getFieldHistory() works');
    console.log(`   - Found ${fieldHistory.length} field changes`);

    // בדיקת canUndo
    const undoCheck = await AuditService.canUndo(testEvent._id);
    console.log('✅ AuditService.canUndo() works');
    console.log(`   - Can undo: ${undoCheck.canUndo}, Reason: ${undoCheck.reason}`);

    // בדיקת getAuditStats
    const stats = await AuditService.getAuditStats();
    console.log('✅ AuditService.getAuditStats() works');
    console.log(`   - Total events: ${stats.totalEvents}`);
    console.log(`   - Unique users: ${stats.uniqueUsers}\n`);

    // בדיקת שאילתות EventService
    console.log('🔍 Testing EventService Queries...');
    
    // בדיקת getEventsByUser
    const userEvents = await EventService.getEventsByUser(testEvent.userId, { limit: 10 });
    console.log('✅ EventService.getEventsByUser() works');
    console.log(`   - Found ${userEvents.length} user events`);

    // בדיקת getEventsByEntity
    const entityEvents = await EventService.getEventsByEntity('CONTRACTOR', testEvent.entityId, { limit: 10 });
    console.log('✅ EventService.getEventsByEntity() works');
    console.log(`   - Found ${entityEvents.length} entity events`);

    // בדיקת searchEvents
    const searchResults = await EventService.searchEvents({
      action: 'CREATE',
      limit: 10
    });
    console.log('✅ EventService.searchEvents() works');
    console.log(`   - Found ${searchResults.length} events matching search`);

    // בדיקת getEventStats
    const eventStats = await EventService.getEventStats();
    console.log('✅ EventService.getEventStats() works');
    console.log(`   - Total events: ${eventStats.totalEvents}`);
    console.log(`   - Success rate: ${eventStats.successRate.toFixed(2)}%\n`);

    // בדיקת אינדקסים
    console.log('🔍 Testing Database Indexes...');
    const indexes = await Event.collection.getIndexes();
    console.log('✅ Database indexes created successfully');
    console.log(`   - Total indexes: ${Object.keys(indexes).length}`);
    
    // בדיקת ביצועים של שאילתה
    console.log('\n🔍 Testing Query Performance...');
    const startTime = Date.now();
    await Event.find({ action: 'CREATE' }).limit(100).lean();
    const queryTime = Date.now() - startTime;
    console.log(`✅ Query performance test completed in ${queryTime}ms`);

    // ניקוי נתוני בדיקה
    console.log('\n🧹 Cleaning up test data...');
    await Event.deleteMany({ 
      $or: [
        { 'metadata.test': true },
        { userEmail: 'test@example.com' }
      ]
    });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed successfully!');
    console.log('✅ Event Logging Infrastructure is working correctly');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    // סגירת חיבור ל-MongoDB
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// הרצת הבדיקה
if (require.main === module) {
  testEventLogging()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = testEventLogging;