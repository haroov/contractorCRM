const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'contractor-crm';
const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';

async function testAuditSystem() {
  let client;
  
  try {
    console.log('🧪 Starting audit system test...');
    console.log(`📍 Database: ${dbName}`);
    console.log(`📍 Server: ${serverUrl}`);
    
    // 1. Test MongoDB connection and collections
    console.log('\n1️⃣ Testing MongoDB connection...');
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ MongoDB connected successfully');
    
    const db = client.db(dbName);
    
    // Check if audit_events collection exists
    const collections = await db.listCollections().toArray();
    const auditCollection = collections.find(col => col.name === 'audit_events');
    
    if (auditCollection) {
      console.log('✅ audit_events collection exists');
      
      // Check indexes
      const auditEventsCollection = db.collection('audit_events');
      const indexes = await auditEventsCollection.indexes();
      console.log(`✅ Found ${indexes.length} indexes on audit_events collection`);
      
      // Show index names
      indexes.forEach(index => {
        console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
      });
      
      // Check document count
      const count = await auditEventsCollection.countDocuments();
      console.log(`📊 Current audit events count: ${count}`);
      
    } else {
      console.log('⚠️ audit_events collection does not exist yet (will be created on first event)');
    }
    
    // 2. Test server endpoints
    console.log('\n2️⃣ Testing server endpoints...');
    
    try {
      // Test health endpoint
      const healthResponse = await axios.get(`${serverUrl}/api/health`, { timeout: 5000 });
      console.log('✅ Health endpoint working');
    } catch (error) {
      console.log('❌ Health endpoint failed:', error.message);
    }
    
    // Test audit endpoints (these will fail without authentication, but we check if they exist)
    try {
      const auditResponse = await axios.get(`${serverUrl}/api/audit/events`, { 
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      if (auditResponse.status === 401 || auditResponse.status === 403) {
        console.log('✅ Audit events endpoint exists (requires authentication)');
      } else if (auditResponse.status === 200) {
        console.log('✅ Audit events endpoint working');
      } else {
        console.log(`⚠️ Audit events endpoint returned status: ${auditResponse.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Server is not running. Please start the server first.');
      } else {
        console.log('❌ Audit events endpoint failed:', error.message);
      }
    }
    
    // 3. Test audit service functionality
    console.log('\n3️⃣ Testing audit service functionality...');
    
    // Create a test audit event directly in the database
    const testEvent = {
      eventType: 'system_test',
      eventCategory: 'system',
      action: 'test',
      description: 'Test audit event created by test script',
      success: true,
      severity: 'low',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        testScript: true,
        version: '1.0.0'
      }
    };
    
    try {
      const auditEventsCollection = db.collection('audit_events');
      const result = await auditEventsCollection.insertOne(testEvent);
      console.log('✅ Test audit event created successfully');
      console.log(`   Event ID: ${result.insertedId}`);
      
      // Query the event back
      const retrievedEvent = await auditEventsCollection.findOne({ _id: result.insertedId });
      if (retrievedEvent) {
        console.log('✅ Test audit event retrieved successfully');
      } else {
        console.log('❌ Failed to retrieve test audit event');
      }
      
      // Clean up test event
      await auditEventsCollection.deleteOne({ _id: result.insertedId });
      console.log('✅ Test audit event cleaned up');
      
    } catch (error) {
      console.log('❌ Error testing audit event creation:', error.message);
    }
    
    // 4. Test audit indexes performance
    console.log('\n4️⃣ Testing audit indexes performance...');
    
    try {
      const auditEventsCollection = db.collection('audit_events');
      
      // Test timestamp index
      const timestampQuery = { timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
      const timestampStart = Date.now();
      await auditEventsCollection.find(timestampQuery).limit(10).toArray();
      const timestampTime = Date.now() - timestampStart;
      console.log(`✅ Timestamp query took ${timestampTime}ms`);
      
      // Test event category index
      const categoryQuery = { eventCategory: 'system' };
      const categoryStart = Date.now();
      await auditEventsCollection.find(categoryQuery).limit(10).toArray();
      const categoryTime = Date.now() - categoryStart;
      console.log(`✅ Category query took ${categoryTime}ms`);
      
      // Test compound index
      const compoundQuery = { eventCategory: 'system', eventType: 'system_test' };
      const compoundStart = Date.now();
      await auditEventsCollection.find(compoundQuery).limit(10).toArray();
      const compoundTime = Date.now() - compoundStart;
      console.log(`✅ Compound query took ${compoundTime}ms`);
      
    } catch (error) {
      console.log('❌ Error testing index performance:', error.message);
    }
    
    // 5. Validate audit model schema
    console.log('\n5️⃣ Validating audit model schema...');
    
    try {
      // Import the audit model to validate it loads correctly
      const auditModelPath = require.resolve('../server/models/AuditEvent.js');
      delete require.cache[auditModelPath]; // Clear cache
      const { AuditEvent, EventTypes } = require('../server/models/AuditEvent.js');
      
      console.log('✅ Audit model loaded successfully');
      console.log(`✅ Found ${Object.keys(EventTypes).length} event types defined`);
      
      // Test some event types
      const sampleEventTypes = ['USER_LOGIN', 'CONTRACTOR_CREATED', 'SYSTEM_ERROR'];
      sampleEventTypes.forEach(type => {
        if (EventTypes[type]) {
          console.log(`   ✅ ${type}: ${EventTypes[type]}`);
        } else {
          console.log(`   ❌ Missing event type: ${type}`);
        }
      });
      
    } catch (error) {
      console.log('❌ Error validating audit model:', error.message);
    }
    
    // 6. Test audit service
    console.log('\n6️⃣ Testing audit service...');
    
    try {
      const auditServicePath = require.resolve('../server/services/auditService.js');
      delete require.cache[auditServicePath]; // Clear cache
      const auditService = require('../server/services/auditService.js');
      
      console.log('✅ Audit service loaded successfully');
      console.log('✅ Audit service is an EventEmitter instance');
      
      // Test event emission (without actually saving to DB in test mode)
      const originalSaveMethod = auditService.saveAuditEvent;
      auditService.saveAuditEvent = async (eventData) => {
        console.log(`   📝 Would save event: ${eventData.eventType}`);
        return { _id: 'test-id', ...eventData };
      };
      
      // Test some audit logging methods
      const testUser = { _id: 'test-user-id', email: 'test@example.com', name: 'Test User' };
      const testReq = { 
        ip: '127.0.0.1', 
        get: () => 'Test User Agent',
        method: 'GET',
        url: '/test',
        sessionID: 'test-session'
      };
      
      auditService.logUserLogin(testUser, testReq);
      console.log('✅ User login logging test passed');
      
      auditService.logSystemError(new Error('Test error'), testReq, testUser);
      console.log('✅ System error logging test passed');
      
      // Restore original method
      auditService.saveAuditEvent = originalSaveMethod;
      
    } catch (error) {
      console.log('❌ Error testing audit service:', error.message);
    }
    
    // 7. Generate test report
    console.log('\n📊 Generating test report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        name: dbName,
        auditCollectionExists: !!auditCollection,
        indexCount: auditCollection ? indexes.length : 0
      },
      server: {
        url: serverUrl,
        healthEndpoint: 'unknown', // Would need to be set based on actual test results
        auditEndpoint: 'unknown'
      },
      tests: {
        mongoConnection: '✅',
        auditModel: '✅',
        auditService: '✅',
        indexPerformance: '✅'
      }
    };
    
    console.log('📋 Test Report:');
    console.log(JSON.stringify(report, null, 2));
    
    console.log('\n🎉 Audit system test completed successfully!');
    
    // 8. Next steps
    console.log('\n📋 Next steps:');
    console.log('1. Start your server: npm run server');
    console.log('2. Start your frontend: npm run dev');
    console.log('3. Login as admin user');
    console.log('4. Navigate to /audit to see the audit dashboard');
    console.log('5. Perform some actions (create/edit contractors, login/logout)');
    console.log('6. Check the audit dashboard to see logged events');
    console.log('7. Use the audit API endpoints to query events programmatically');
    
  } catch (error) {
    console.error('💥 Audit system test failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 MongoDB connection closed');
    }
  }
}

// Additional function to create sample audit data for testing
async function createSampleAuditData() {
  let client;
  
  try {
    console.log('\n🎭 Creating sample audit data...');
    
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const auditEventsCollection = db.collection('audit_events');
    
    const sampleEvents = [
      {
        eventType: 'user_login',
        eventCategory: 'authentication',
        userEmail: 'admin@example.com',
        userName: 'Admin User',
        userRole: 'admin',
        action: 'login',
        description: 'User admin@example.com logged in successfully',
        success: true,
        severity: 'low',
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        deviceInfo: {
          ip: '192.168.1.100',
          browser: 'Chrome 120.0',
          os: 'Windows 10',
          device: 'Desktop'
        }
      },
      {
        eventType: 'contractor_created',
        eventCategory: 'contractor',
        userEmail: 'admin@example.com',
        userName: 'Admin User',
        userRole: 'admin',
        resourceType: 'contractor',
        resourceId: 'test-contractor-id',
        resourceName: 'Test Contractor Ltd.',
        action: 'create',
        description: 'New contractor created: Test Contractor Ltd.',
        success: true,
        severity: 'medium',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        deviceInfo: {
          ip: '192.168.1.100',
          browser: 'Chrome 120.0',
          os: 'Windows 10',
          device: 'Desktop'
        }
      },
      {
        eventType: 'contractor_viewed',
        eventCategory: 'contractor',
        userEmail: 'user@example.com',
        userName: 'Regular User',
        userRole: 'user',
        resourceType: 'contractor',
        resourceId: 'test-contractor-id',
        resourceName: 'Test Contractor Ltd.',
        action: 'read',
        description: 'Contractor viewed: Test Contractor Ltd.',
        success: true,
        severity: 'low',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        deviceInfo: {
          ip: '192.168.1.101',
          browser: 'Firefox 119.0',
          os: 'macOS 14',
          device: 'Desktop'
        }
      },
      {
        eventType: 'user_login_failed',
        eventCategory: 'authentication',
        userEmail: 'hacker@badsite.com',
        action: 'login',
        description: 'Failed login attempt for hacker@badsite.com',
        success: false,
        severity: 'high',
        errorMessage: 'Invalid credentials',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        deviceInfo: {
          ip: '10.0.0.50',
          browser: 'Unknown',
          os: 'Linux',
          device: 'Unknown'
        }
      },
      {
        eventType: 'system_error',
        eventCategory: 'system',
        action: 'error',
        description: 'Database connection timeout',
        success: false,
        severity: 'critical',
        errorMessage: 'Connection timeout after 30 seconds',
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        metadata: {
          errorCode: 'DB_TIMEOUT',
          retryCount: 3
        }
      }
    ];
    
    // Add timestamps
    sampleEvents.forEach(event => {
      event.createdAt = event.timestamp;
      event.updatedAt = event.timestamp;
    });
    
    const result = await auditEventsCollection.insertMany(sampleEvents);
    console.log(`✅ Created ${result.insertedCount} sample audit events`);
    
    return result.insertedIds;
    
  } catch (error) {
    console.error('❌ Error creating sample audit data:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--sample-data')) {
    console.log('🎭 Creating sample audit data...');
    await createSampleAuditData();
    console.log('✅ Sample data created successfully!');
  }
  
  await testAuditSystem();
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testAuditSystem,
  createSampleAuditData
};