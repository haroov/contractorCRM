const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { MongoClient, ObjectId } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://contractor-crm-liav-geffens-projects.vercel.app',
    'https://contractor-crm.vercel.app',
    'https://contractor-ox9okh9qd-choco-insurance.vercel.app',
    'https://dash.chocoinsurance.com',
    'https://accounts.google.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Session-ID', 'X-Contact-User'],
  exposedHeaders: ['Set-Cookie']
}));

// Add CORS logging middleware
app.use((req, res, next) => {
  console.log('🔍 CORS Request:', req.method, req.url, 'from origin:', req.headers.origin);
  next();
});
app.use(express.json());
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'contractor-crm-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // More secure
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Import and configure passport
require('./config/passport.js');
console.log('✅ Passport configured');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// MongoDB connection
let client;
let mongoServer;

async function connectDB() {
  try {
    let mongoUri;

    // Check if we should use persistent MongoDB or Memory Server
    const useMemoryServer = process.env.USE_MEMORY_SERVER !== 'false';

    if (useMemoryServer) {
      // Use MongoDB Memory Server for local development
      mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      console.log('✅ Connected to MongoDB Memory Server');
    } else {
      // Use persistent MongoDB
      mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';
      console.log('✅ Connected to persistent MongoDB');
    }

    console.log('📊 Database URI:', mongoUri);

    // Connect with Mongoose for User model
    await mongoose.connect(mongoUri);
    console.log('✅ Mongoose connected');

    client = new MongoClient(mongoUri);
    await client.connect();

    // Create unique index on company_id to prevent duplicates
    const db = client.db('contractor-crm');
    try {
      await db.collection('contractors').createIndex({ company_id: 1 }, { unique: true, sparse: true });
      console.log('✅ Created unique index on company_id');
    } catch (error) {
      if (error.code === 86) {
        console.log('✅ Index already exists on company_id');
      } else {
        console.error('❌ Error creating index:', error);
      }
    }

    // No automatic sample data creation - contractors must be added manually
    console.log('📝 No automatic sample data creation - contractors must be added manually');

  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

// Sample data creation function - REMOVED
// System now only accepts manually entered data

// Data persistence functions

// Companies Register validation service
async function validateContractorStatus(companyId) {
  try {
    const companiesRegisterUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3176f9a054&q=${companyId}`;

    const response = await fetch(companiesRegisterUrl);
    if (!response.ok) {
      console.log(`⚠️ Failed to fetch from Companies Register for company ${companyId}:`, response.status);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.result || !data.result.records || data.result.records.length === 0) {
      console.log(`ℹ️ No data found in Companies Register for company ${companyId}`);
      return null;
    }

    const companyRecord = data.result.records[0];

    // Extract relevant status information from Hebrew field names
    const status = companyRecord['סטטוס חברה'] || null;
    const isViolator = companyRecord['מפרה'] && companyRecord['מפרה'].trim() !== '' ? true : false;
    const restrictions = [];

    // Check for restrictions - ignore "מוגבלת" as it's a normal status for Ltd companies
    if (companyRecord['מגבלות'] && companyRecord['מגבלות'].trim() !== '' && companyRecord['מגבלות'] !== 'מוגבלת') {
      restrictions.push(companyRecord['מגבלות']);
    }

    console.log(`✅ Validated company ${companyId}: status=${status}, violator=${isViolator}, restrictions=${restrictions.length}`);

    return {
      status,
      violator: isViolator,
      restrictions: restrictions.length > 0 ? restrictions : null
    };
  } catch (error) {
    console.error(`❌ Error validating company ${companyId}:`, error);
    return null;
  }
}

// Debug endpoint to check users
app.get('/debug-users', async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find({});
    res.json({
      message: 'Users in database',
      count: users.length,
      users: users.map(u => ({
        email: u.email,
        name: u.name,
        role: u.role,
        googleId: u.googleId,
        isActive: u.isActive,
        lastLogin: u.lastLogin
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import auth routes
const authRoutes = require('./routes/auth.js');
app.use('/auth', authRoutes);
console.log('✅ Auth routes configured');

// Import user management routes
const userRoutes = require('./routes/users.js');
app.use('/api/users', userRoutes);
console.log('✅ User management routes configured');

// Import contact authentication routes
const contactAuthRoutes = require('./routes/contact-auth.js');
app.use('/api/contact-auth', contactAuthRoutes);
console.log('✅ Contact authentication routes configured');

// Import contractors routes
const contractorsRoutes = require('./routes/contractors.js');
app.use('/api/contractors', contractorsRoutes);
console.log('✅ Contractors routes configured');

// Import auth middleware
const { requireAuth } = require('./middleware/auth.js');
const { requireContactAuth, requireContactManager, requireContactContractorAccess } = require('./middleware/contact-auth.js');

// Test endpoint for user creation debugging
app.get('/test-users', (req, res) => {
  res.json({ message: 'Users endpoint is working', timestamp: new Date().toISOString() });
});

// Handle OPTIONS request for validate-status endpoint
app.options('/api/contractors/validate-status/:contractorId', cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://contractor-crm-liav-geffens-projects.vercel.app',
    'https://contractor-crm.vercel.app',
    'https://contractor-ox9okh9qd-choco-insurance.vercel.app',
    'https://dash.chocoinsurance.com',
    'https://accounts.google.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Session-ID'],
  exposedHeaders: ['Set-Cookie']
}), (req, res) => {
  res.status(200).end();
});

// Validate and update contractor status from Companies Register
app.post('/api/contractors/validate-status/:contractorId', cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://contractor-crm-liav-geffens-projects.vercel.app',
    'https://contractor-crm.vercel.app',
    'https://contractor-ox9okh9qd-choco-insurance.vercel.app',
    'https://dash.chocoinsurance.com',
    'https://accounts.google.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Session-ID'],
  exposedHeaders: ['Set-Cookie']
}), requireAuth, async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractor = await db.collection('contractors').findOne({
      $or: [
        { contractor_id: req.params.contractorId },
        { _id: new ObjectId(req.params.contractorId) }
      ]
    });

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    if (!contractor.company_id) {
      return res.status(400).json({ error: 'Contractor has no company_id for validation' });
    }

    console.log(`🔍 Validating contractor ${contractor.name} (${contractor.company_id})`);

    // Validate status from Companies Register
    const validationResult = await validateContractorStatus(contractor.company_id);

    if (validationResult) {
      // Update contractor with validated status
      const updateResult = await db.collection('contractors').updateOne(
        {
          $or: [
            { contractor_id: req.params.contractorId },
            { _id: new ObjectId(req.params.contractorId) }
          ]
        },
        {
          $set: {
            status: validationResult.status,
            violator: validationResult.violator,
            restrictions: validationResult.restrictions,
            updatedAt: new Date()
          }
        }
      );

      console.log(`✅ Updated contractor ${contractor.name} with validated status`);

      res.json({
        message: 'Contractor status validated and updated',
        contractor: contractor.name,
        validation: validationResult,
        updated: updateResult.modifiedCount > 0
      });
    } else {
      // Clear status fields if no validation data
      const updateResult = await db.collection('contractors').updateOne(
        { contractor_id: req.params.contractorId },
        {
          $set: {
            status: null,
            violator: null,
            restrictions: null,
            updatedAt: new Date()
          }
        }
      );

      console.log(`ℹ️ Cleared status fields for contractor ${contractor.name} (no validation data)`);

      res.json({
        message: 'No validation data available, status fields cleared',
        contractor: contractor.name,
        updated: updateResult.modifiedCount > 0
      });
    }
  } catch (error) {
    console.error('❌ Error validating contractor status:', error);
    res.status(500).json({ error: 'Failed to validate contractor status' });
  }
});

// Apply authentication to protected routes
app.use('/api/contractors', requireAuth);
app.use('/api/projects', requireAuth);
console.log('✅ Auth middleware configured');

// Test route for auth
app.get('/auth/test', (req, res) => {
  res.json({ message: 'Auth routes are working!', timestamp: new Date().toISOString() });
});

// Auth status route is now handled by server/routes/auth.js

// Dashboard route (redirect to frontend)
app.get('/dashboard', (req, res) => {
  res.redirect('https://contractor-crm.vercel.app/');
});

// Google OAuth routes (temporary until auth routes are properly loaded)
// Google OAuth routes are handled by auth.js router

app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// API Routes
app.get('/api/health', (req, res) => {
  const dbType = process.env.USE_MEMORY_SERVER !== 'false' ? 'MongoDB Memory Server' : 'Persistent MongoDB';
  res.json({
    status: 'OK',
    message: 'Contractor CRM API is running',
    database: dbType,
    timestamp: new Date().toISOString()
  });
});

// Fix mainContractor field endpoint
app.post('/api/fix-maincontractor', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractorsCollection = db.collection('contractors');
    const projectsCollection = db.collection('projects');

    // Get all contractors to create a mapping from contractor_id to _id
    const contractors = await contractorsCollection.find({}).toArray();
    const contractorMapping = {};

    contractors.forEach(contractor => {
      contractorMapping[contractor.contractor_id] = contractor._id.toString();
    });

    console.log('Contractor mapping:', contractorMapping);

    // Get all projects that need fixing
    const projects = await projectsCollection.find({
      mainContractor: { $type: "string" } // Find projects where mainContractor is a string (contractor_id)
    }).toArray();

    console.log(`Found ${projects.length} projects to fix`);

    const results = [];

    // Update each project
    for (const project of projects) {
      const contractorId = project.mainContractor;
      const contractorObjectId = contractorMapping[contractorId];

      if (contractorObjectId) {
        console.log(`Updating project ${project.projectName} (${project._id}):`);
        console.log(`  - mainContractor: "${contractorId}" -> "${contractorObjectId}"`);

        const result = await projectsCollection.updateOne(
          { _id: project._id },
          {
            $set: {
              mainContractor: contractorObjectId,
              updatedAt: new Date()
            }
          }
        );

        results.push({
          projectId: project._id,
          projectName: project.projectName,
          oldMainContractor: contractorId,
          newMainContractor: contractorObjectId,
          modified: result.modifiedCount
        });

        console.log(`  - Update result: ${result.modifiedCount} document(s) modified`);
      } else {
        console.log(`Warning: No contractor found for contractor_id: ${contractorId}`);
        results.push({
          projectId: project._id,
          projectName: project.projectName,
          oldMainContractor: contractorId,
          newMainContractor: null,
          modified: 0,
          error: 'Contractor not found'
        });
      }
    }

    console.log('✅ MainContractor field fix completed!');
    res.json({
      success: true,
      message: `Fixed ${results.length} projects`,
      results: results
    });

  } catch (error) {
    console.error('❌ Error fixing mainContractor field:', error);
    res.status(500).json({ error: 'Failed to fix mainContractor field' });
  }
});



// Bulk validate all contractors from Companies Register
app.post('/api/contractors/validate-all-status', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractors = await db.collection('contractors').find({}).toArray();

    console.log(`🔍 Starting bulk validation for ${contractors.length} contractors`);

    const results = [];
    let updatedCount = 0;
    let errorCount = 0;

    for (const contractor of contractors) {
      try {
        if (!contractor.company_id) {
          results.push({
            contractor: contractor.name,
            status: 'skipped',
            reason: 'No company_id'
          });
          continue;
        }

        console.log(`🔍 Validating ${contractor.name} (${contractor.company_id})`);

        // Validate status from Companies Register
        const validationResult = await validateContractorStatus(contractor.company_id);

        if (validationResult) {
          // Update contractor with validated status
          await db.collection('contractors').updateOne(
            { contractor_id: contractor.contractor_id },
            {
              $set: {
                status: validationResult.status,
                violator: validationResult.violator,
                restrictions: validationResult.restrictions,
                updatedAt: new Date()
              }
            }
          );

          results.push({
            contractor: contractor.name,
            status: 'updated',
            validation: validationResult
          });
          updatedCount++;
        } else {
          // Clear status fields if no validation data
          await db.collection('contractors').updateOne(
            { contractor_id: contractor.contractor_id },
            {
              $set: {
                status: null,
                violator: null,
                restrictions: null,
                updatedAt: new Date()
              }
            }
          );

          results.push({
            contractor: contractor.name,
            status: 'cleared',
            reason: 'No validation data'
          });
          updatedCount++;
        }

        // Add a small delay to avoid overwhelming the external API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error validating ${contractor.name}:`, error);
        results.push({
          contractor: contractor.name,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    console.log(`✅ Bulk validation completed: ${updatedCount} updated, ${errorCount} errors`);

    res.json({
      message: 'Bulk validation completed',
      total: contractors.length,
      updated: updatedCount,
      errors: errorCount,
      results
    });
  } catch (error) {
    console.error('❌ Error in bulk validation:', error);
    res.status(500).json({ error: 'Failed to perform bulk validation' });
  }
});

// Update fullAddress for all existing contractors
app.post('/api/contractors/update-full-address', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractors = await db.collection('contractors').find({}).toArray();

    let updatedCount = 0;
    for (const contractor of contractors) {
      if (contractor.address && contractor.city) {
        const fullAddress = `${contractor.address}, ${contractor.city}`;
        await db.collection('contractors').updateOne(
          { _id: contractor._id },
          { $set: { fullAddress: fullAddress } }
        );
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Updated fullAddress for ${updatedCount} contractors`,
      updatedCount
    });
  } catch (error) {
    console.error('❌ Error updating fullAddress:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating fullAddress',
      error: error.message
    });
  }
});

// Contractors API
app.get('/api/contractors', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractors = await db.collection('contractors').find({}).toArray();

    // Get projects for each contractor
    const contractorsWithProjects = [];

    for (const contractor of contractors) {
      const contractorWithoutTemp = contractor;
      const projectIds = contractor.projectIds || [];
      let projects = [];

      if (projectIds.length > 0) {
        // Convert string IDs to ObjectIds and fetch projects
        const objectIds = projectIds.map(id => new ObjectId(id));
        projects = await db.collection('projects').find({
          _id: { $in: objectIds }
        }).toArray();

        // Add contractor information to each project
        projects = projects.map(project => ({
          ...project,
          contractorId: contractor.contractor_id,
          contractorName: contractor.name
        }));
      }

      contractorsWithProjects.push({
        ...contractorWithoutTemp,
        projects: projects
      });
    }

    console.log('📋 Fetched', contractorsWithProjects.length, 'contractors');
    res.json(contractorsWithProjects);
  } catch (error) {
    console.error('❌ Error fetching contractors:', error);
    res.status(500).json({ error: 'Failed to fetch contractors' });
  }
});

app.get('/api/contractors/:id', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractor = await db.collection('contractors').findOne({ contractor_id: req.params.id });
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Get projects for this contractor
    const projectIds = contractor.projectIds || [];
    let projects = [];

    if (projectIds.length > 0) {
      // Convert string IDs to ObjectIds and fetch projects
      const objectIds = projectIds.map(id => new ObjectId(id));
      projects = await db.collection('projects').find({
        _id: { $in: objectIds }
      }).toArray();

      // Add contractor information to each project
      projects = projects.map(project => ({
        ...project,
        contractorId: contractor.contractor_id,
        contractorName: contractor.name
      }));
    }

    // Return contractor with projects populated
    const contractorWithoutTemp = contractor;
    const contractorWithProjects = {
      ...contractorWithoutTemp,
      projects: projects
    };

    res.json(contractorWithProjects);
  } catch (error) {
    console.error('❌ Error fetching contractor:', error);
    res.status(500).json({ error: 'Failed to fetch contractor' });
  }
});

app.post('/api/contractors', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractorData = {
      ...req.body,
      contractor_id: req.body.contractor_id || `contractor-${Date.now()}`,
      // הוספת שדה fullAddress אוטומטית
      fullAddress: (req.body.address && req.body.address.trim() && req.body.city && req.body.city.trim()) ? `${req.body.address.trim()}, ${req.body.city.trim()}` : '',
      // וידוא שדה iso45001 תמיד קיים עם ערך ברירת מחדל
      iso45001: req.body.iso45001 === true ? true : false
    };
    const result = await db.collection('contractors').insertOne(contractorData);
    console.log('✅ Created new contractor:', result.insertedId);
    res.status(201).json({ ...contractorData, _id: result.insertedId });
  } catch (error) {
    console.error('❌ Error creating contractor:', error);
    res.status(500).json({ error: 'Failed to create contractor' });
  }
});

app.put('/api/contractors/:id', async (req, res) => {
  try {
    console.log('🔍 PUT /api/contractors/:id called with ID:', req.params.id);
    console.log('🔍 Request body keys:', Object.keys(req.body));

    const db = client.db('contractor-crm');

    // Remove immutable fields from update data
    const { _id, createdAt, ...updateData } = req.body;

    // קבלת הנתונים הקיימים בדאטה בייס
    let existingContractor;
    try {
      // ננסה לחפש לפי contractor_id קודם (מספר)
      existingContractor = await db.collection('contractors').findOne({
        contractor_id: req.params.id
      });

      // אם לא נמצא, ננסה לחפש לפי ObjectId (רק אם זה ObjectId תקין)
      if (!existingContractor && req.params.id.length === 24) {
        existingContractor = await db.collection('contractors').findOne({
          _id: new ObjectId(req.params.id)
        });
      }
    } catch (error) {
      console.log('❌ Error searching for contractor:', error.message);
      return res.status(400).json({ error: 'Invalid contractor ID format' });
    }
    if (!existingContractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // עדכון שדה fullAddress - שימוש בערכים החדשים או הקיימים
    const address = updateData.address || existingContractor.address;
    const city = updateData.city || existingContractor.city;
    const fullAddress = (address && address.trim() && city && city.trim()) ? `${address.trim()}, ${city.trim()}` : '';

    const finalUpdateData = {
      ...updateData,
      // עדכון שדה fullAddress
      fullAddress: fullAddress,
      // וידוא שדה iso45001 תמיד קיים עם ערך ברירת מחדל
      iso45001: updateData.iso45001 === true ? true : false
    };

    // עדכון הקבלן - נשתמש באותו לוגיקה כמו בחיפוש
    let result;
    try {
      // ננסה לעדכן לפי contractor_id קודם
      result = await db.collection('contractors').updateOne(
        { contractor_id: req.params.id },
        { $set: finalUpdateData }
      );

      // אם לא נמצא, ננסה לפי ObjectId (רק אם זה ObjectId תקין)
      if (result.matchedCount === 0 && req.params.id.length === 24) {
        result = await db.collection('contractors').updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: finalUpdateData }
        );
      }
    } catch (error) {
      console.log('❌ Error updating contractor:', error.message);
      return res.status(500).json({ error: 'Failed to update contractor' });
    }
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    console.log('✅ Updated contractor:', req.params.id);

    // Return the updated contractor data without projects field
    const updatedContractor = await db.collection('contractors').findOne({ contractor_id: req.params.id });
    const { projects, ...contractorWithoutProjects } = updatedContractor;
    const contractorWithProjectIds = {
      ...contractorWithoutProjects,
      projectIds: updatedContractor.projectIds || []
    };
    res.json(contractorWithProjectIds);
  } catch (error) {
    console.error('❌ Error updating contractor:', error);
    res.status(500).json({ error: 'Failed to update contractor' });
  }
});

app.delete('/api/contractors/:id', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    // Try to delete by _id first, then by contractor_id
    let result = await db.collection('contractors').deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      result = await db.collection('contractors').deleteOne({ contractor_id: req.params.id });
    }
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    console.log('✅ Deleted contractor:', req.params.id);
    res.json({ message: 'Contractor deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting contractor:', error);
    res.status(500).json({ error: 'Failed to delete contractor' });
  }
});

// נתיב לעדכון שמות שדות בקולקציה contractors
app.post('/api/contractors/update-field-names', async (req, res) => {
  try {
    const { oldField, newField } = req.body;

    if (!oldField || !newField) {
      return res.status(400).json({ error: 'oldField and newField are required' });
    }

    const db = client.db('contractor-crm');
    const collection = db.collection('contractors');

    // עדכון שם השדה
    const result = await collection.updateMany(
      { [oldField]: { $exists: true } },
      [
        {
          $addFields: {
            [newField]: '$' + oldField
          }
        },
        {
          $unset: oldField
        }
      ]
    );

    console.log('✅ Updated', result.modifiedCount, 'documents');
    console.log('Field name changed from', oldField, 'to', newField);

    res.json({
      message: 'Field names updated successfully',
      modifiedCount: result.modifiedCount,
      oldField,
      newField
    });
  } catch (error) {
    console.error('❌ Error updating field names:', error);
    res.status(500).json({ error: 'Failed to update field names' });
  }
});

// נתיב לעדכון שמות שדות בקולקציה projects
app.post('/api/projects/update-field-names', async (req, res) => {
  try {
    const { oldField, newField } = req.body;

    if (!oldField || !newField) {
      return res.status(400).json({ error: 'oldField and newField are required' });
    }

    const db = client.db('contractor-crm');
    const collection = db.collection('projects');

    // עדכון שם השדה
    const result = await collection.updateMany(
      { [oldField]: { $exists: true } },
      [
        {
          $addFields: {
            [newField]: '$' + oldField
          }
        },
        {
          $unset: oldField
        }
      ]
    );

    console.log('✅ Updated', result.modifiedCount, 'documents');
    console.log('Field name changed from', oldField, 'to', newField);

    res.json({
      message: 'Field names updated successfully',
      modifiedCount: result.modifiedCount,
      oldField,
      newField
    });
  } catch (error) {
    console.error('❌ Error updating field names:', error);
    res.status(500).json({ error: 'Failed to update field names' });
  }
});

// Projects API
app.get('/api/projects', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const { contractorId } = req.query;

    let query = {};
    if (contractorId) {
      query.mainContractor = contractorId;
    }

    const projects = await db.collection('projects').find(query).toArray();

    // Calculate correct status for each project
    const projectsWithStatus = projects.map(project => {
      const status = calculateProjectStatus(project.startDate, project.durationMonths, project.isClosed);
      return { ...project, status };
    });

    console.log('📋 Fetched', projectsWithStatus.length, 'projects for contractor:', contractorId || 'all');
    res.json(projectsWithStatus);
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const projectId = req.params.id;

    console.log('🔍 Fetching project by ID:', projectId);

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      console.log('❌ Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate correct status for the project
    const status = calculateProjectStatus(project.startDate, project.durationMonths, project.isClosed);
    const projectWithStatus = { ...project, status };

    console.log('✅ Fetched project:', projectWithStatus.projectName);
    res.json(projectWithStatus);
  } catch (error) {
    console.error('❌ Error fetching project by ID:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Get projects by contractor with population
app.get('/api/contractors/:id/projects', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const { id } = req.params;

    // Get contractor with project IDs
    const contractor = await db.collection('contractors').findOne({ contractor_id: id });
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Get projects by IDs
    const projectIds = contractor.projectIds || [];
    const projects = await db.collection('projects').find({
      _id: { $in: projectIds.map(id => new ObjectId(id)) }
    }).toArray();

    console.log('📋 Fetched', projects.length, 'projects for contractor:', id);
    res.json(projects);
  } catch (error) {
    console.error('❌ Error fetching contractor projects:', error);
    res.status(500).json({ error: 'Failed to fetch contractor projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const projectData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create the project
    const result = await db.collection('projects').insertOne(projectData);
    console.log('✅ Created new project:', result.insertedId);

    // Add project ID to contractor's projectIds array
    if (req.body.mainContractor) {
      await db.collection('contractors').updateOne(
        { _id: new ObjectId(req.body.mainContractor) },
        { $push: { projectIds: result.insertedId.toString() } }
      );
      console.log('✅ Added project ID to contractor:', req.body.mainContractor);

      // Update contractor statistics automatically
      await updateContractorStats(db, req.body.mainContractor);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    const result = await db.collection('projects').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    console.log('✅ Updated project:', req.params.id);

    // Update contractor statistics automatically
    if (req.body.mainContractor) {
      try {
        await updateContractorStats(db, req.body.mainContractor);
      } catch (statsError) {
        console.error('❌ Error updating contractor stats:', statsError);
        // Don't fail the main request if stats update fails
      }
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    // First, get the project to find its contractorId
    const project = await db.collection('projects').findOne({ _id: new ObjectId(req.params.id) });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete the project
    const result = await db.collection('projects').deleteOne({ _id: new ObjectId(req.params.id) });
    console.log('✅ Deleted project:', req.params.id);

    // Since we're using embedded projects, we need to remove the project from the contractor
    if (project.contractorId) {
      await db.collection('contractors').updateOne(
        { contractor_id: project.contractorId },
        { $pull: { projects: { _id: new ObjectId(req.params.id) } } }
      );
      console.log('✅ Removed project from contractor:', project.contractorId);

      // Update contractor statistics automatically
      await updateContractorStats(db, project.contractorId);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Helper function to update contractor statistics
// Calculate project status based on dates
function calculateProjectStatus(startDate, durationMonths, isClosed) {
  if (isClosed) return 'completed';

  if (!startDate) return 'future';

  const start = new Date(startDate);
  const now = new Date();
  const endDate = new Date(start);
  endDate.setMonth(start.getMonth() + (durationMonths || 0));

  if (now < start) return 'future';
  if (now >= start && now <= endDate) return 'current';
  return 'completed';
}

async function updateContractorStats(db, contractorId) {
  try {
    // Get all projects for this contractor using mainContractor field
    const projects = await db.collection('projects').find({
      mainContractor: contractorId
    }).toArray();

    // Calculate statistics
    let currentProjects = 0;
    let currentProjectsValue = 0;
    let futureProjects = 0;
    let futureProjectsValue = 0;

    projects.forEach(project => {
      // Calculate correct status for each project
      const status = calculateProjectStatus(project.startDate, project.durationMonths, project.isClosed);

      if (status === 'current') {
        currentProjects++;
        currentProjectsValue += project.valueNis || project.value || 0;
      } else if (status === 'future') {
        futureProjects++;
        futureProjectsValue += project.valueNis || project.value || 0;
      }
    });

    // Update contractor with new statistics
    const result = await db.collection('contractors').updateOne(
      { _id: new ObjectId(contractorId) },
      {
        $set: {
          current_projects: currentProjects,
          current_projects_value_nis: currentProjectsValue,
          forcast_projects: futureProjects,
          forcast_projects_value_nis: futureProjectsValue
        }
      }
    );

    console.log('✅ Updated contractor stats:', contractorId, {
      currentProjects,
      currentProjectsValue,
      futureProjects,
      futureProjectsValue
    });

    return { currentProjects, currentProjectsValue, futureProjects, futureProjectsValue };
  } catch (error) {
    console.error('❌ Error updating contractor stats:', error);
    throw error;
  }
}

// Update contractor project statistics
app.post('/api/contractors/:contractorId/update-stats', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractorId = req.params.contractorId;

    const stats = await updateContractorStats(db, contractorId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error updating contractor stats:', error);
    res.status(500).json({ error: 'Failed to update contractor stats' });
  }
});

// Endpoint to create pending users
app.post('/api/users/create-pending', requireAuth, async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'Emails array is required' });
    }

    const users = [];
    for (const email of emails) {
      // Check if user already exists
      const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (!existingUser) {
        const user = {
          email: email.toLowerCase(),
          name: email.split('@')[0], // Use email prefix as name
          role: 'user',
          isActive: false, // Pending users are inactive
          createdAt: new Date(),
          lastLogin: null
        };

        const result = await db.collection('users').insertOne(user);
        users.push({ ...user, _id: result.insertedId });
      }
    }

    res.json({
      message: 'Pending users created successfully',
      users: users,
      total: users.length
    });
  } catch (error) {
    console.error('❌ Error creating pending users:', error);
    res.status(500).json({ error: 'Failed to create pending users' });
  }
});

// Temporary endpoint to add all pending users
app.get('/add-pending-users', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const pendingEmails = [
      'idan@yozmot.net',
      'finkelmanyael@gmail.com',
      'Shifra.sankewitz@gmail.com',
      'mor@cns-law.co.il',
      'uriel@chocoinsurance.com',
      'shlomo@chocoinsurance.com',
      'steven.kostyn@gmail.com'
    ];

    const users = [];
    for (const email of pendingEmails) {
      try {
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (!existingUser) {
          const user = {
            email: email.toLowerCase(),
            name: email.split('@')[0], // Use email prefix as name
            role: 'user',
            isActive: false, // Pending users are inactive
            createdAt: new Date(),
            lastLogin: null
          };

          const result = await db.collection('users').insertOne(user);
          users.push({ ...user, _id: result.insertedId });
          console.log(`✅ Created pending user: ${email}`);
        } else {
          console.log(`⚠️ User already exists: ${email}`);
        }
      } catch (userError) {
        console.error(`❌ Error with user ${email}:`, userError);
      }
    }

    res.json({
      message: 'Pending users added successfully',
      users: users,
      total: users.length,
      alreadyExists: pendingEmails.length - users.length
    });
  } catch (error) {
    console.error('❌ Error adding pending users:', error);
    res.status(500).json({ error: 'Failed to add pending users', details: error.message });
  }
});

// Simple endpoint to check users
app.get('/check-users', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const users = await db.collection('users').find({}).toArray();
    res.json({
      message: 'Users retrieved successfully',
      users: users,
      total: users.length
    });
  } catch (error) {
    console.error('❌ Error checking users:', error);
    res.status(500).json({ error: 'Failed to check users', details: error.message });
  }
});

// Direct endpoint to add pending users
app.post('/api/users/add-pending', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const pendingEmails = [
      'idan@yozmot.net',
      'finkelmanyael@gmail.com',
      'Shifra.sankewitz@gmail.com',
      'mor@cns-law.co.il',
      'uriel@chocoinsurance.com',
      'shlomo@chocoinsurance.com',
      'steven.kostyn@gmail.com'
    ];

    const users = [];
    for (const email of pendingEmails) {
      try {
        const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (!existingUser) {
          const user = {
            email: email.toLowerCase(),
            name: email.split('@')[0],
            role: 'user',
            isActive: false,
            createdAt: new Date(),
            lastLogin: null
          };

          const result = await db.collection('users').insertOne(user);
          users.push({ ...user, _id: result.insertedId });
          console.log(`✅ Created pending user: ${email}`);
        }
      } catch (userError) {
        console.error(`❌ Error with user ${email}:`, userError);
      }
    }

    res.json({
      message: 'Pending users added successfully',
      users: users,
      total: users.length
    });
  } catch (error) {
    console.error('❌ Error adding pending users:', error);
    res.status(500).json({ error: 'Failed to add pending users', details: error.message });
  }
});

// Simple GET endpoint to add pending users
app.get('/add-pending-users-simple', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const pendingEmails = [
      'finkelmanyael@gmail.com',
      'Shifra.sankewitz@gmail.com',
      'mor@cns-law.co.il',
      'shlomo@chocoinsurance.com',
      'steven.kostyn@gmail.com'
    ];

    const users = [];
    for (const email of pendingEmails) {
      try {
        const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (!existingUser) {
          const user = {
            email: email.toLowerCase(),
            name: email.split('@')[0],
            role: 'user',
            isActive: false,
            createdAt: new Date(),
            lastLogin: null
          };

          const result = await db.collection('users').insertOne(user);
          users.push({ ...user, _id: result.insertedId });
          console.log(`✅ Created pending user: ${email}`);
        } else {
          console.log(`⚠️ User already exists: ${email}`);
        }
      } catch (userError) {
        console.error(`❌ Error with user ${email}:`, userError);
      }
    }

    res.json({
      message: 'Pending users added successfully',
      users: users,
      total: users.length
    });
  } catch (error) {
    console.error('❌ Error adding pending users:', error);
    res.status(500).json({ error: 'Failed to add pending users', details: error.message });
  }
});

// Direct endpoint to add all missing users
app.get('/add-all-missing-users', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    // Get all existing users
    const existingUsers = await db.collection('users').find({}).toArray();
    const existingEmails = existingUsers.map(u => u.email.toLowerCase());

    // No hardcoded emails - all users come from database
    const allPendingEmails = [];

    const missingEmails = allPendingEmails.filter(email =>
      !existingEmails.includes(email.toLowerCase())
    );

    const users = [];
    for (const email of missingEmails) {
      try {
        const user = {
          email: email.toLowerCase(),
          name: email.split('@')[0],
          role: 'user',
          isActive: false,
          createdAt: new Date(),
          lastLogin: null
        };

        const result = await db.collection('users').insertOne(user);
        users.push({ ...user, _id: result.insertedId });
        console.log(`✅ Created missing user: ${email}`);
      } catch (userError) {
        console.error(`❌ Error with user ${email}:`, userError);
      }
    }

    res.json({
      message: 'Missing users added successfully',
      existingUsers: existingUsers.length,
      missingUsers: users.length,
      users: users
    });
  } catch (error) {
    console.error('❌ Error adding missing users:', error);
    res.status(500).json({ error: 'Failed to add missing users', details: error.message });
  }
});

// Simple endpoint to add specific users
app.get('/add-specific-users', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    const specificEmails = [
      'finkelmanyael@gmail.com',
      'Shifra.sankewitz@gmail.com',
      'mor@cns-law.co.il',
      'uriel@chocoinsurance.com',
      'shlomo@chocoinsurance.com',
      'steven.kostyn@gmail.com'
    ];

    const users = [];
    for (const email of specificEmails) {
      try {
        const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (!existingUser) {
          const user = {
            email: email.toLowerCase(),
            name: email.split('@')[0],
            role: 'user',
            isActive: false,
            createdAt: new Date(),
            lastLogin: null
          };

          const result = await db.collection('users').insertOne(user);
          users.push({ ...user, _id: result.insertedId });
          console.log(`✅ Created user: ${email}`);
        } else {
          console.log(`⚠️ User already exists: ${email}`);
        }
      } catch (userError) {
        console.error(`❌ Error with user ${email}:`, userError);
      }
    }

    res.json({
      message: 'Specific users processed successfully',
      createdUsers: users.length,
      users: users
    });
  } catch (error) {
    console.error('❌ Error adding specific users:', error);
    res.status(500).json({ error: 'Failed to add specific users', details: error.message });
  }
});

// Force add users endpoint
app.get('/force-add-users', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    const emails = [
      'finkelmanyael@gmail.com',
      'Shifra.sankewitz@gmail.com',
      'mor@cns-law.co.il',
      'uriel@chocoinsurance.com',
      'shlomo@chocoinsurance.com',
      'steven.kostyn@gmail.com'
    ];

    const users = [];
    for (const email of emails) {
      try {
        // Force insert without checking if exists
        const user = {
          email: email.toLowerCase(),
          name: email.split('@')[0],
          role: 'user',
          isActive: false,
          createdAt: new Date(),
          lastLogin: null
        };

        const result = await db.collection('users').insertOne(user);
        users.push({ ...user, _id: result.insertedId });
        console.log(`✅ Force created user: ${email}`);
      } catch (userError) {
        console.error(`❌ Error with user ${email}:`, userError);
      }
    }

    res.json({
      message: 'Users force added successfully',
      createdUsers: users.length,
      users: users
    });
  } catch (error) {
    console.error('❌ Error force adding users:', error);
    res.status(500).json({ error: 'Failed to force add users', details: error.message });
  }
});

// Simple direct add users endpoint
app.get('/add-users-now', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    // Add users one by one with error handling
    const emails = [
      'finkelmanyael@gmail.com',
      'Shifra.sankewitz@gmail.com',
      'mor@cns-law.co.il',
      'uriel@chocoinsurance.com',
      'shlomo@chocoinsurance.com',
      'steven.kostyn@gmail.com'
    ];

    let added = 0;
    let errors = 0;
    let details = [];

    for (const email of emails) {
      try {
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (existingUser) {
          details.push(`User ${email} already exists`);
          continue;
        }

        const user = {
          email: email.toLowerCase(),
          name: email.split('@')[0],
          role: 'user',
          isActive: false,
          createdAt: new Date(),
          lastLogin: null,
          googleId: `pending_${email.replace('@', '_').replace('.', '_')}_${Date.now()}`
        };

        await db.collection('users').insertOne(user);
        added++;
        details.push(`✅ Added: ${email}`);
        console.log(`✅ Added: ${email}`);
      } catch (err) {
        errors++;
        details.push(`⚠️ Error with ${email}: ${err.message}`);
        console.log(`⚠️ Skipped ${email}: ${err.message}`);
      }
    }

    res.json({
      message: `Added ${added} users, ${errors} errors`,
      added: added,
      errors: errors,
      details: details
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to add users with unique googleId
app.get('/add-users-unique', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    const emails = [
      'finkelmanyael@gmail.com',
      'Shifra.sankewitz@gmail.com',
      'mor@cns-law.co.il',
      'uriel@chocoinsurance.com',
      'shlomo@chocoinsurance.com',
      'steven.kostyn@gmail.com'
    ];

    let added = 0;
    let errors = 0;
    const details = [];

    for (const email of emails) {
      try {
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (existingUser) {
          details.push(`User ${email} already exists`);
          continue;
        }

        // Create unique googleId for each user
        const uniqueGoogleId = `pending_${email.replace('@', '_').replace('.', '_')}_${Date.now()}`;

        const user = {
          email: email.toLowerCase(),
          name: email.split('@')[0],
          role: 'user',
          isActive: false,
          createdAt: new Date(),
          lastLogin: null,
          googleId: uniqueGoogleId
        };

        await db.collection('users').insertOne(user);
        added++;
        details.push(`✅ Added: ${email} with googleId: ${uniqueGoogleId}`);
        console.log(`✅ Added: ${email} with googleId: ${uniqueGoogleId}`);
      } catch (err) {
        errors++;
        details.push(`⚠️ Error with ${email}: ${err.message}`);
        console.log(`⚠️ Error with ${email}:`, err.message);
      }
    }

    res.json({
      message: `Added ${added} users, ${errors} errors`,
      added,
      errors,
      details
    });
  } catch (error) {
    console.error('Error adding users:', error);
    res.status(500).json({ error: 'Failed to add users' });
  }
});

// Direct endpoint to add all missing users
app.get('/add-all-missing-users', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    // Get all existing users
    const existingUsers = await db.collection('users').find({}).toArray();
    const existingEmails = existingUsers.map(u => u.email.toLowerCase());

    // No hardcoded emails - all users come from database
    const allPendingEmails = [];

    const missingEmails = allPendingEmails.filter(email =>
      !existingEmails.includes(email.toLowerCase())
    );

    const users = [];
    for (const email of missingEmails) {
      try {
        const user = {
          email: email.toLowerCase(),
          name: email.split('@')[0],
          role: 'user',
          isActive: false,
          createdAt: new Date(),
          lastLogin: null
        };

        const result = await db.collection('users').insertOne(user);
        users.push({ ...user, _id: result.insertedId });
        console.log(`✅ Created missing user: ${email}`);
      } catch (userError) {
        console.error(`❌ Error with user ${email}:`, userError);
      }
    }

    res.json({
      message: 'Missing users added successfully',
      existingUsers: existingUsers.length,
      missingUsers: users.length,
      users: users
    });
  } catch (error) {
    console.error('❌ Error adding missing users:', error);
    res.status(500).json({ error: 'Failed to add missing users', details: error.message });
  }
});

// Removed duplicate endpoint

// Simple endpoint to add specific users
app.get('/add-specific-users', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    const usersToAdd = [
      {
        email: 'finkelmanyael@gmail.com',
        name: 'finkelmanyael',
        role: 'user',
        isActive: false,
        createdAt: new Date(),
        lastLogin: null
      },
      {
        email: 'Shifra.sankewitz@gmail.com',
        name: 'Shifra.sankewitz',
        role: 'user',
        isActive: false,
        createdAt: new Date(),
        lastLogin: null
      },
      {
        email: 'mor@cns-law.co.il',
        name: 'mor',
        role: 'user',
        isActive: false,
        createdAt: new Date(),
        lastLogin: null
      },
      {
        email: 'uriel@chocoinsurance.com',
        name: 'uriel',
        role: 'user',
        isActive: false,
        createdAt: new Date(),
        lastLogin: null
      },
      {
        email: 'shlomo@chocoinsurance.com',
        name: 'shlomo',
        role: 'user',
        isActive: false,
        createdAt: new Date(),
        lastLogin: null
      },
      {
        email: 'steven.kostyn@gmail.com',
        name: 'steven.kostyn',
        role: 'user',
        isActive: false,
        createdAt: new Date(),
        lastLogin: null
      },
      // Users come from database only
    ];

    const users = [];
    for (const user of usersToAdd) {
      try {
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email: user.email.toLowerCase() });
        if (!existingUser) {
          const result = await db.collection('users').insertOne(user);
          users.push({ ...user, _id: result.insertedId });
          console.log(`✅ Created user: ${user.email}`);
        } else {
          console.log(`⚠️ User already exists: ${user.email}`);
        }
      } catch (userError) {
        console.error(`❌ Error with user ${user.email}:`, userError);
      }
    }

    res.json({
      message: 'Users added successfully',
      addedUsers: users.length,
      users: users
    });
  } catch (error) {
    console.error('❌ Error adding users:', error);
    res.status(500).json({ error: 'Failed to add users', details: error.message });
  }
});

// Cleanup contractors without names
app.get('/api/cleanup-contractors', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    
    // Get all contractors
    const allContractors = await db.collection('contractors').find({}).toArray();
    console.log(`📊 Found ${allContractors.length} contractors in database`);
    
    // Find contractors without names or with empty names
    const invalidContractors = allContractors.filter(contractor => 
      !contractor.name || 
      contractor.name.trim() === '' || 
      contractor.name === 'undefined' ||
      contractor.name === 'null'
    );
    
    console.log(`🗑️ Found ${invalidContractors.length} invalid contractors to delete:`);
    invalidContractors.forEach(contractor => {
      console.log(`  - ID: ${contractor._id}, Name: "${contractor.name}", Company ID: ${contractor.company_id}`);
    });
    
    let deletedCount = 0;
    if (invalidContractors.length > 0) {
      // Delete invalid contractors
      const deleteResult = await db.collection('contractors').deleteMany({
        _id: { $in: invalidContractors.map(c => c._id) }
      });
      
      deletedCount = deleteResult.deletedCount;
      console.log(`✅ Deleted ${deletedCount} invalid contractors`);
    }
    
    // Get remaining contractors
    const remainingContractors = await db.collection('contractors').find({}).toArray();
    console.log(`📊 Remaining contractors: ${remainingContractors.length}`);
    
    // If we have more than 15 contractors, keep only the first 15
    let excessDeleted = 0;
    if (remainingContractors.length > 15) {
      console.log(`⚠️ More than 15 contractors found. Keeping only the first 15.`);
      
      const contractorsToDelete = remainingContractors.slice(15);
      const deleteResult = await db.collection('contractors').deleteMany({
        _id: { $in: contractorsToDelete.map(c => c._id) }
      });
      
      excessDeleted = deleteResult.deletedCount;
      console.log(`✅ Deleted ${excessDeleted} excess contractors`);
    }
    
    // Get final contractors
    const finalContractors = await db.collection('contractors').find({}).toArray();
    
    res.json({
      success: true,
      message: 'Contractors cleaned up successfully',
      deleted: {
        invalid: deletedCount,
        excess: excessDeleted,
        total: deletedCount + excessDeleted
      },
      remaining: finalContractors.length,
      contractors: finalContractors.map(c => ({
        id: c._id,
        name: c.name,
        company_id: c.company_id
      }))
    });
    
  } catch (error) {
    console.error('❌ Error cleaning up contractors:', error);
    res.status(500).json({ error: 'Failed to cleanup contractors' });
  }
});

// Fix project contractor linkage and add mainContractor field
app.get('/fix', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    // Get all contractors
    const contractors = await db.collection('contractors').find({}).toArray();

    // Get all projects
    const projects = await db.collection('projects').find({}).toArray();

    // Find צ.מ.ח המרמן
    const hamarman = contractors.find(c => c.name && c.name.includes('המרמן'));

    // Find the specific project with ObjectId 68b73fa52f9650bd88f32578
    const projectToFix = projects.find(p => p._id.toString() === "68b73fa52f9650bd88f32578");

    if (hamarman && projectToFix) {
      // Update the project with mainContractor field and correct contractorId
      await db.collection('projects').updateOne(
        { _id: projectToFix._id },
        {
          $set: {
            contractorId: hamarman.contractor_id,
            mainContractor: hamarman.contractor_id
          }
        }
      );

      // Clean up contractor's projectIds array - remove incorrect project IDs
      const correctProjectId = projectToFix._id.toString();
      await db.collection('contractors').updateOne(
        { contractor_id: hamarman.contractor_id },
        {
          $set: {
            projectIds: [correctProjectId] // Only keep the correct project ID
          }
        }
      );

      // Update contractor statistics
      await updateContractorStats(db, hamarman.contractor_id);

      res.json({
        success: true,
        message: 'Project linkage fixed and mainContractor field added',
        hamarman: {
          contractor_id: hamarman.contractor_id,
          name: hamarman.name
        },
        project: {
          projectName: projectToFix.projectName,
          objectId: projectToFix._id.toString(),
          contractorId: hamarman.contractor_id,
          mainContractor: hamarman.contractor_id
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Could not find contractor or project',
        hamarman: hamarman ? { contractor_id: hamarman.contractor_id, name: hamarman.name } : null,
        project: projectToFix ? { projectName: projectToFix.projectName, objectId: projectToFix._id.toString() } : null
      });
    }
  } catch (error) {
    console.error('❌ Error fixing project linkage:', error);
    res.status(500).json({ error: 'Failed to fix project linkage' });
  }
});

// Add a default route for the root path
app.get('/', (req, res) => {
  res.json({
    message: 'Contractor CRM API is running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      contractors: '/api/contractors',
      projects: '/api/projects',
      debug: '/api/debug/contractor-stats'
    }
  });
});

// Add Content Security Policy headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; font-src 'self' data:; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval';");
  next();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  if (client) {
    await client.close();
  }
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  process.exit(0);
});

// Start server
// Contact User Routes (Limited Access)
// Get contractor details for contact user (read-only or editable based on permissions)
app.get('/api/contact/contractor/:id', requireContactAuth, requireContactContractorAccess, async (req, res) => {
  console.log('🔍 Contact contractor endpoint called with ID:', req.params.id);
  console.log('🔍 Session data:', req.session);

  try {
    const db = client.db('contractor-crm');
    const contractor = await db.collection('contractors').findOne({
      $or: [
        { contractor_id: req.params.id },
        { _id: new ObjectId(req.params.id) }
      ]
    });

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Get projects for this contractor
    const projects = await db.collection('projects').find({
      mainContractor: contractor._id.toString()
    }).toArray();

    // Calculate project status for each project
    const projectsWithStatus = projects.map(project => ({
      ...project,
      status: calculateProjectStatus(project.startDate, project.durationMonths, project.isClosed)
    }));

    res.json({
      ...contractor,
      projects: projectsWithStatus
    });
  } catch (error) {
    console.error('❌ Error getting contractor for contact user:', error);
    res.status(500).json({ error: 'Failed to get contractor' });
  }
});

// Validate contractor status for contact users
app.post('/api/contact/contractor/validate-status/:id', async (req, res) => {
  console.log('🔍 Contact validate status endpoint called with ID:', req.params.id);

  try {
    const db = client.db('contractor-crm');
    const contractor = await db.collection('contractors').findOne({
      $or: [
        { contractor_id: req.params.id },
        { _id: new ObjectId(req.params.id) }
      ]
    });

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // For now, just return a success message
    // In a real implementation, this would validate against external company registry
    res.json({
      updated: false,
      message: 'סטטוס החברה תקין'
    });
  } catch (error) {
    console.error('❌ Error validating contractor status for contact user:', error);
    res.status(500).json({ error: 'Failed to validate contractor status' });
  }
});

// Get projects for contact users
app.get('/api/contact/projects', async (req, res) => {
  console.log('🔍 Contact projects endpoint called');
  console.log('🔍 Session data:', req.session);

  try {
    const db = client.db('contractor-crm');
    const contractorId = req.query.contractorId;

    if (!contractorId) {
      return res.status(400).json({ error: 'Contractor ID is required' });
    }

    // Get projects for this contractor
    const projects = await db.collection('projects').find({
      mainContractor: contractorId
    }).toArray();

    // Calculate project status for each project
    const projectsWithStatus = projects.map(project => ({
      ...project,
      status: calculateProjectStatus(project.startDate, project.durationMonths, project.isClosed)
    }));

    res.json(projectsWithStatus);
  } catch (error) {
    console.error('❌ Error getting projects for contact user:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Update contractor details (only for contact managers)
app.put('/api/contact/contractor/:id', requireContactAuth, requireContactManager, requireContactContractorAccess, async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    // Remove immutable fields from update data
    const { _id, createdAt, ...updateData } = req.body;

    const result = await db.collection('contractors').updateOne(
      {
        $or: [
          { contractor_id: req.params.id },
          { _id: new ObjectId(req.params.id) }
        ]
      },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json({ message: 'Contractor updated successfully', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('❌ Error updating contractor:', error);
    res.status(500).json({ error: 'Failed to update contractor' });
  }
});

// Get projects for contact user's contractor
app.get('/api/contact/projects', requireContactAuth, async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractorId = req.session.contactUser.contractorId;

    const projects = await db.collection('projects').find({
      mainContractor: contractorId
    }).toArray();

    // Calculate project status for each project
    const projectsWithStatus = projects.map(project => ({
      ...project,
      status: calculateProjectStatus(project.startDate, project.durationMonths, project.isClosed)
    }));

    res.json(projectsWithStatus);
  } catch (error) {
    console.error('❌ Error getting projects for contact user:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Create new project (only for contact managers)
app.post('/api/contact/projects', requireContactAuth, requireContactManager, async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractorId = req.session.contactUser.contractorId;

    const projectData = {
      ...req.body,
      mainContractor: contractorId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create the project
    const result = await db.collection('projects').insertOne(projectData);
    console.log('✅ Created new project for contact user:', result.insertedId);

    // Add project ID to contractor's projectIds array
    await db.collection('contractors').updateOne(
      { _id: new ObjectId(contractorId) },
      { $push: { projectIds: result.insertedId.toString() } }
    );

    // Update contractor statistics automatically
    await updateContractorStats(db, contractorId);

    res.json(result);
  } catch (error) {
    console.error('❌ Error creating project for contact user:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project (only for contact managers)
app.put('/api/contact/projects/:id', requireContactAuth, requireContactManager, async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractorId = req.session.contactUser.contractorId;

    // Verify project belongs to this contractor
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(req.params.id),
      mainContractor: contractorId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const result = await db.collection('projects').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    // Update contractor statistics automatically
    await updateContractorStats(db, contractorId);

    res.json({ message: 'Project updated successfully', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('❌ Error updating project for contact user:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project (only for contact managers)
app.delete('/api/contact/projects/:id', requireContactAuth, requireContactManager, async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractorId = req.session.contactUser.contractorId;

    // Verify project belongs to this contractor
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(req.params.id),
      mainContractor: contractorId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const result = await db.collection('projects').deleteOne({
      _id: new ObjectId(req.params.id)
    });

    // Remove project ID from contractor's projectIds array
    await db.collection('contractors').updateOne(
      { _id: new ObjectId(contractorId) },
      { $pull: { projectIds: req.params.id } }
    );

    // Update contractor statistics automatically
    await updateContractorStats(db, contractorId);

    res.json({ message: 'Project deleted successfully', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('❌ Error deleting project for contact user:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log('🚀 Server running on port', PORT);
    console.log('🏥 Health check: http://localhost:' + PORT + '/api/health');
    console.log('📋 Projects API: http://localhost:' + PORT + '/api/projects');
    console.log('👥 Contact Auth API: http://localhost:' + PORT + '/api/contact-auth');
  });
});

// Users come from database only

// Removed hardcoded user creation endpoint - users come from database only

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// Force server restart
app.get('/restart', (req, res) => {
  res.json({ message: 'Server restart requested', timestamp: new Date().toISOString() });
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Removed duplicate debug endpoint
