const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'contractor-crm';

async function createAuditIndexes() {
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db(dbName);
    const auditCollection = db.collection('audit_events');
    
    console.log('📊 Creating audit event indexes...');
    
    // Drop existing indexes (except _id) to start fresh
    try {
      const existingIndexes = await auditCollection.indexes();
      console.log('📋 Existing indexes:', existingIndexes.map(idx => idx.name));
      
      for (const index of existingIndexes) {
        if (index.name !== '_id_') {
          try {
            await auditCollection.dropIndex(index.name);
            console.log(`🗑️ Dropped index: ${index.name}`);
          } catch (error) {
            console.log(`⚠️ Could not drop index ${index.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Error managing existing indexes:', error.message);
    }
    
    // Create new optimized indexes
    const indexes = [
      // Primary timestamp index (most recent first)
      {
        keys: { timestamp: -1 },
        options: { 
          name: 'timestamp_desc',
          background: true
        }
      },
      
      // Event type and timestamp
      {
        keys: { eventType: 1, timestamp: -1 },
        options: { 
          name: 'eventType_timestamp',
          background: true
        }
      },
      
      // Event category and timestamp
      {
        keys: { eventCategory: 1, timestamp: -1 },
        options: { 
          name: 'eventCategory_timestamp',
          background: true
        }
      },
      
      // User ID and timestamp (for user activity queries)
      {
        keys: { userId: 1, timestamp: -1 },
        options: { 
          name: 'userId_timestamp',
          background: true,
          sparse: true // Skip documents where userId is null
        }
      },
      
      // User email and timestamp (for searching by email)
      {
        keys: { userEmail: 1, timestamp: -1 },
        options: { 
          name: 'userEmail_timestamp',
          background: true,
          sparse: true
        }
      },
      
      // Resource type, resource ID, and timestamp (for resource history)
      {
        keys: { resourceType: 1, resourceId: 1, timestamp: -1 },
        options: { 
          name: 'resource_timestamp',
          background: true,
          sparse: true
        }
      },
      
      // Session ID and timestamp (for session tracking)
      {
        keys: { sessionId: 1, timestamp: -1 },
        options: { 
          name: 'sessionId_timestamp',
          background: true,
          sparse: true
        }
      },
      
      // Success status and timestamp (for error tracking)
      {
        keys: { success: 1, timestamp: -1 },
        options: { 
          name: 'success_timestamp',
          background: true
        }
      },
      
      // Severity and timestamp (for security monitoring)
      {
        keys: { severity: 1, timestamp: -1 },
        options: { 
          name: 'severity_timestamp',
          background: true
        }
      },
      
      // Compound index for category, type, and timestamp
      {
        keys: { eventCategory: 1, eventType: 1, timestamp: -1 },
        options: { 
          name: 'category_type_timestamp',
          background: true
        }
      },
      
      // Compound index for user and category (user activity by category)
      {
        keys: { userId: 1, eventCategory: 1, timestamp: -1 },
        options: { 
          name: 'user_category_timestamp',
          background: true,
          sparse: true
        }
      },
      
      // Compound index for resource type and action
      {
        keys: { resourceType: 1, action: 1, timestamp: -1 },
        options: { 
          name: 'resourceType_action_timestamp',
          background: true,
          sparse: true
        }
      },
      
      // IP address index for security analysis
      {
        keys: { 'deviceInfo.ip': 1, timestamp: -1 },
        options: { 
          name: 'ip_timestamp',
          background: true,
          sparse: true
        }
      },
      
      // Text search index for descriptions and user info
      {
        keys: { 
          description: 'text',
          userEmail: 'text',
          userName: 'text',
          resourceName: 'text'
        },
        options: { 
          name: 'text_search',
          background: true,
          weights: {
            description: 10,
            userEmail: 5,
            userName: 5,
            resourceName: 3
          }
        }
      },
      
      // TTL index for automatic cleanup (2 years)
      {
        keys: { timestamp: 1 },
        options: { 
          name: 'ttl_cleanup',
          background: true,
          expireAfterSeconds: 63072000 // 2 years in seconds
        }
      }
    ];
    
    // Create indexes
    for (const index of indexes) {
      try {
        console.log(`📝 Creating index: ${index.options.name}...`);
        await auditCollection.createIndex(index.keys, index.options);
        console.log(`✅ Created index: ${index.options.name}`);
      } catch (error) {
        console.error(`❌ Error creating index ${index.options.name}:`, error.message);
      }
    }
    
    // Verify indexes were created
    console.log('\n📊 Verifying created indexes...');
    const finalIndexes = await auditCollection.indexes();
    console.log('📋 Final indexes:');
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Get collection stats
    console.log('\n📈 Collection statistics:');
    try {
      const stats = await auditCollection.stats();
      console.log(`  - Documents: ${stats.count || 0}`);
      console.log(`  - Size: ${(stats.size || 0)} bytes`);
      console.log(`  - Index size: ${(stats.totalIndexSize || 0)} bytes`);
      console.log(`  - Indexes: ${stats.nindexes || 0}`);
    } catch (error) {
      console.log('  - Could not get collection stats (collection might be empty)');
    }
    
    console.log('\n✅ Audit indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating audit indexes:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 MongoDB connection closed');
    }
  }
}

// Additional function to create indexes for existing collections to support audit queries
async function createSupportingIndexes() {
  let client;
  
  try {
    console.log('\n🔗 Creating supporting indexes for existing collections...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db(dbName);
    
    // Indexes for users collection (for audit user lookups)
    console.log('📝 Creating user collection indexes...');
    const usersCollection = db.collection('users');
    
    try {
      await usersCollection.createIndex({ email: 1 }, { 
        name: 'email_unique',
        unique: true,
        background: true 
      });
      console.log('✅ Created users email index');
    } catch (error) {
      console.log('⚠️ Users email index might already exist:', error.message);
    }
    
    try {
      await usersCollection.createIndex({ lastLogin: -1 }, { 
        name: 'lastLogin_desc',
        background: true,
        sparse: true 
      });
      console.log('✅ Created users lastLogin index');
    } catch (error) {
      console.log('⚠️ Users lastLogin index creation failed:', error.message);
    }
    
    // Indexes for contractors collection (for audit resource lookups)
    console.log('📝 Creating contractor collection indexes...');
    const contractorsCollection = db.collection('contractors');
    
    try {
      await contractorsCollection.createIndex({ updatedAt: -1 }, { 
        name: 'updatedAt_desc',
        background: true,
        sparse: true 
      });
      console.log('✅ Created contractors updatedAt index');
    } catch (error) {
      console.log('⚠️ Contractors updatedAt index creation failed:', error.message);
    }
    
    console.log('✅ Supporting indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating supporting indexes:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the script
async function main() {
  console.log('🚀 Starting audit indexes creation...');
  console.log(`📍 Database: ${dbName}`);
  console.log(`📍 URI: ${uri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in log
  
  await createAuditIndexes();
  await createSupportingIndexes();
  
  console.log('\n🎉 All indexes created successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. The audit system is now ready to use');
  console.log('2. Start your application to begin collecting audit events');
  console.log('3. Use the audit API endpoints to view and analyze events');
  console.log('4. Monitor the audit_events collection size and performance');
  
  process.exit(0);
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  createAuditIndexes,
  createSupportingIndexes
};