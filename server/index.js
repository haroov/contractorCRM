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
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');
const cron = require('node-cron');

// Import routes
const uploadRoutes = require('./routes/upload');
const projectFilesRoutes = require('./routes/project-files');
const documentParserRoutes = require('./routes/document-parser');
const riskAnalysisRoutes = require('./routes/risk-analysis');
const companyAnalysisRoutes = require('./routes/company-analysis-v2');
console.log("✅ Company analysis routes loaded");
const gisRoutes = require('./routes/gis');
const pdfThumbnailRoutes = require('./routes/pdf-thumbnail');
const safetyReportsRoutes = require('./routes/safety-reports');
const { SafetyMonitorService } = require('./services/safetyMonitorService');

// Import audit system
const auditService = require('./services/auditService');
const { auditMiddleware, trackUserActivity } = require('./middleware/audit');
const auditRoutes = require('./routes/audit');
const { addAuditContext, logAuthEvent, createAuditAwareOperation } = require('./lib/auditHelper');
console.log("✅ Audit system loaded");

dotenv.config();

// Helper function to transform flat insurance coverage fields to nested structure (for loading)
function transformInsuranceCoverageFields(project) {
  console.log('🔍 transformInsuranceCoverageFields called for project:', project.projectName);
  console.log('🔍 Raw insuranceSpecification from MongoDB:', project.insuranceSpecification);

  const transformed = { ...project };

  // Define coverage types and their field mappings
  const coverageTypes = [
    'theftCoverage',
    'workPropertyCoverage',
    'adjacentPropertyCoverage',
    'transitPropertyCoverage',
    'auxiliaryBuildingsCoverage',
    'machineryInstallationCoverage',
    'debrisRemoval',
    'architectFees',
    'authorityChanges'
  ];

  // Ensure insuranceSpecification exists
  if (!transformed.insuranceSpecification) {
    transformed.insuranceSpecification = {};
  }

  // Transform each coverage type from flat to nested structure
  coverageTypes.forEach(coverageType => {
    console.log(`🔍 Processing ${coverageType}:`, transformed.insuranceSpecification[coverageType]);

    // Check if the field is already in nested structure
    if (transformed.insuranceSpecification[coverageType] && typeof transformed.insuranceSpecification[coverageType] === 'object' &&
      transformed.insuranceSpecification[coverageType].hasOwnProperty('isActive')) {
      // Already in nested structure, keep as is
      console.log(`✅ ${coverageType} already in nested structure, keeping as is`);
      return;
    }

    // Transform from flat to nested structure
    const isActive = transformed.insuranceSpecification[coverageType];
    const insuranceSum = transformed.insuranceSpecification[`${coverageType}Amount`];
    const deductibles = transformed.insuranceSpecification[`${coverageType}Deductible`];

    console.log(`🔄 Transforming ${coverageType} from flat to nested:`, { isActive, insuranceSum, deductibles });

    // Create nested structure
    transformed.insuranceSpecification[coverageType] = {
      isActive: isActive || false,
      insuranceSum: insuranceSum || '',
      deductibles: deductibles || ''
    };

    // Remove the old flat fields
    delete transformed.insuranceSpecification[`${coverageType}Amount`];
    delete transformed.insuranceSpecification[`${coverageType}Deductible`];
  });

  console.log('🔍 Final transformed insuranceSpecification:', transformed.insuranceSpecification);
  return transformed;
}

// Helper function to transform nested insurance coverage fields to flat structure (for saving)
function flattenInsuranceCoverageFields(project) {
  const flattened = { ...project };

  // Define coverage types and their field mappings
  const coverageTypes = [
    'theftCoverage',
    'workPropertyCoverage',
    'adjacentPropertyCoverage',
    'transitPropertyCoverage',
    'auxiliaryBuildingsCoverage',
    'machineryInstallationCoverage',
    'debrisRemoval',
    'architectFees',
    'authorityChanges'
  ];

  // Transform each coverage type from nested to flat structure
  coverageTypes.forEach(coverageType => {
    if (flattened[coverageType] && typeof flattened[coverageType] === 'object') {
      const coverage = flattened[coverageType];

      // Extract values from nested structure
      flattened[coverageType] = coverage.isActive || false;
      flattened[`${coverageType}Amount`] = coverage.insuranceSum || '';
      flattened[`${coverageType}Deductible`] = coverage.deductibles || '';
    }
    // If the data is already in flat structure (which is the current case), keep it as is
    // This handles the case where the client sends flat data like:
    // theftCoverage: true, theftCoverageAmount: 100000, theftCoverageDeductible: 1000
  });

  return flattened;
}

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
  next();
});
app.use(express.json());
app.use(cookieParser());

// Add audit middleware to track all HTTP requests
app.use(auditMiddleware({
  excludePaths: ['/health', '/metrics', '/favicon.ico', '/public', '/assets'],
  excludeMethods: ['OPTIONS'],
  logResponseBody: false,
  logRequestBody: true
}));

// Add user activity tracking middleware
app.use(trackUserActivity());

// 🚨🚨🚨 CRITICAL: Force JSON middleware for ALL API routes BEFORE any other middleware 🚨🚨🚨
app.use('/api', (req, res, next) => {
  console.log('🚨🚨🚨 API MIDDLEWARE HIT (EARLY):', req.originalUrl);
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Handle specific static HTML files BEFORE express.static
app.get('/privacyPolicy.html', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'privacyPolicy.html');

  if (fs.existsSync(filePath)) {
    console.log('✅ Privacy policy found, serving directly');
    res.sendFile(filePath);
  } else {
    console.log('❌ Privacy policy not found, falling back to React');
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
});

app.get('/termsOfService.html', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'termsOfService.html');

  if (fs.existsSync(filePath)) {
    console.log('✅ Terms of service found, serving directly');
    res.sendFile(filePath);
  } else {
    console.log('❌ Terms of service not found, falling back to React');
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads using memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
  }
});

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
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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

    // Create unique index on companyId to prevent duplicates
    const db = client.db('contractor-crm');
    try {
      await db.collection('contractors').createIndex({ companyId: 1 }, { unique: true, sparse: true });
      console.log('✅ Created unique index on companyId');
    } catch (error) {
      if (error.code === 86) {
        console.log('✅ Index already exists on companyId');
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
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // Add direct auth routes for Google OAuth
console.log('✅ Auth routes configured');

// Import user management routes
const userRoutes = require('./routes/users.js');
app.use('/api/users', userRoutes);
console.log('✅ User management routes configured');

// Import contact authentication routes
const contactAuthRoutes = require('./routes/contact-auth.js');
app.use('/api/contact-auth', contactAuthRoutes);
console.log('✅ Contact authentication routes configured');

// Import upload routes
app.use('/api/upload', uploadRoutes);
app.use('/api', projectFilesRoutes);
app.use('/api/document-parser', documentParserRoutes);
app.use('/api/risk-analysis', riskAnalysisRoutes);
app.use('/api/company-analysis', companyAnalysisRoutes);
app.use('/api/gis', gisRoutes);
app.use('/api/pdf-thumbnail', pdfThumbnailRoutes);
app.use('/api/safety-reports', safetyReportsRoutes);
console.log('✅ Upload routes configured');

// Import docs routes
const docsRoutes = require('./routes/docs.js');
app.use('/api/docs', docsRoutes);
console.log('✅ Docs routes configured');

// Import Google Docs routes
const googleDocsRoutes = require('./routes/google-docs.js');
app.use('/api/google-docs', googleDocsRoutes);
console.log('✅ Google Docs routes configured');

// Import enrichment routes
const enrichmentRoutes = require('./routes/enrichment.js');
app.use('/api/enrichment', enrichmentRoutes);
console.log('✅ Enrichment routes configured');

// Import claims routes
const claimsRoutes = require('./routes/claims.js');
app.use('/api/claims', claimsRoutes);
console.log('✅ Claims routes configured');

// Import audit routes
app.use('/api/audit', auditRoutes);
console.log('✅ Audit routes configured');

// Import fix-index routes
const fixIndexRoutes = require('./routes/fix-index.js');
app.use('/api', fixIndexRoutes);
console.log('✅ Fix-index routes configured');

// Import contractors routes
const contractorsRoutes = require('./routes/contractors.js');
console.log('✅ Contractors routes imported');

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

    const companyId = contractor.companyId || contractor.company_id;
    if (!companyId) {
      return res.status(400).json({ error: 'Contractor has no companyId for validation' });
    }


    // Validate status from Companies Register
    const validationResult = await validateContractorStatus(companyId);

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
// For contractors, allow regular auth, contact auth, and system admin
app.use('/api/contractors', (req, res, next) => {
  // Check if it's a system admin first
  const systemAdminHeader = req.headers['x-system-admin'];
  if (systemAdminHeader) {
    console.log('🔑 System admin access to contractors API');
    return next(); // Allow system admin access
  }

  // Check if it's a contact user
  const contactUserHeader = req.headers['x-contact-user'];
  if (contactUserHeader) {
    // Use contact auth middleware
    const { requireContactAuth } = require('./middleware/contact-auth.js');
    return requireContactAuth(req, res, next);
  } else {
    // Use regular auth middleware
    return requireAuth(req, res, next);
  }
}, contractorsRoutes);
// app.use('/api/projects', requireAuth); // Temporarily disabled to debug
// All project routes are now public for debugging
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

// Session debug endpoint
app.get('/api/session-debug', (req, res) => {
  console.log('🔍 Session debug endpoint called');
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 Session data:', req.session);
  console.log('🔍 Cookies:', req.headers.cookie);
  console.log('🔍 Is authenticated:', req.isAuthenticated());

  res.json({
    sessionId: req.sessionID,
    sessionData: req.session,
    cookies: req.headers.cookie,
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
    sessionUser: req.session?.user
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
        const companyId = contractor.companyId || contractor.company_id;
        if (!companyId) {
          results.push({
            contractor: contractor.name,
            status: 'skipped',
            reason: 'No companyId'
          });
          continue;
        }

        console.log(`🔍 Validating ${contractor.name} (${companyId})`);

        // Validate status from Companies Register
        const validationResult = await validateContractorStatus(companyId);

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
    console.log('📋 Contractors API called');
    console.log('📋 Session user:', req.session?.user);
    console.log('📋 Is authenticated:', req.isAuthenticated());
    console.log('📋 Session ID:', req.sessionID);
    console.log('📋 All session data:', req.session);
    console.log('📋 Cookies header:', req.headers.cookie);
    console.log('📋 User-Agent:', req.headers['user-agent']);
    console.log('📋 Origin:', req.headers.origin);
    console.log('📋 Referer:', req.headers.referer);

    const db = client.db('contractor-crm');

    // Check if user is authenticated via session
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      console.log('❌ No session user found - checking localStorage fallback');

      // For now, allow access if no session (for testing)
      // In production, you'd want proper session management
      console.log('⚠️ Allowing access without session for testing');
    }

    let contractors;

    if (sessionUser) {
      console.log('✅ User authenticated:', sessionUser.email, 'Role:', sessionUser.role);

      // Filter contractors based on user role
      if (sessionUser.role === 'admin' || sessionUser.userType === 'system') {
        // Admin users see all contractors
        contractors = await db.collection('contractors').find({}).toArray();
        console.log('📋 Admin user - loading all contractors:', contractors.length);
      } else {
        // Contact users see only their contractor
        contractors = await db.collection('contractors').find({
          'contacts.email': sessionUser.email
        }).toArray();
        console.log('📋 Contact user - loading filtered contractors:', contractors.length);
      }
    } else {
      // Fallback: load all contractors for testing
      console.log('⚠️ No session user - loading all contractors for testing');
      contractors = await db.collection('contractors').find({}).toArray();
      console.log('📋 Fallback - loading all contractors:', contractors.length);
    }

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
          contractorId: contractor._id.toString(), // Use ObjectId as primary identifier
          contractorName: contractor.name,
          // Keep external identifiers for display purposes
          contractorRegistryId: contractor.contractor_id,
          companyId: contractor.companyId
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
    console.log('🔍 Fetching contractor by ID:', req.params.id);

    // Primary lookup by _id (ObjectId) - this is the main identifier
    let contractor = await db.collection('contractors').findOne({ _id: new ObjectId(req.params.id) });

    // Fallback: try by contractor_id or companyId for backward compatibility
    if (!contractor) {
      console.log('🔍 Not found by _id, trying contractor_id or companyId for backward compatibility');
      contractor = await db.collection('contractors').findOne({
        $or: [
          { contractor_id: req.params.id },
          { companyId: req.params.id }
        ]
      });
    }

    if (!contractor) {
      console.log('❌ Contractor not found');
      return res.status(404).json({ error: 'Contractor not found' });
    }

    console.log('✅ Found contractor:', contractor.name || contractor.nameEnglish);

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
        contractorId: contractor._id.toString(), // Use ObjectId as primary identifier
        contractorName: contractor.name,
        // Keep external identifiers for display purposes
        contractorRegistryId: contractor.contractor_id,
        companyId: contractor.companyId
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
    console.log('🔍 POST /api/contractors called');
    console.log('🔍 Request body keys:', Object.keys(req.body));
    console.log('🔍 Request body companyId:', req.body.companyId);
    console.log('🔍 Request body company_id:', req.body.company_id);
    console.log('🔍 Full request body:', req.body);

    const db = client.db('contractor-crm');
    const contractorData = {
      ...req.body,
      contractor_id: req.body.contractor_id || `contractor-${Date.now()}`,
      // הוספת שדה fullAddress אוטומטית
      fullAddress: (req.body.address && req.body.address.trim() && req.body.city && req.body.city.trim()) ? `${req.body.address.trim()}, ${req.body.city.trim()}` : '',
      // וידוא שדה iso45001 תמיד קיים עם ערך ברירת מחדל
      iso45001: req.body.iso45001 === true ? true : false
    };

    console.log('🔍 Final contractorData to insert:', contractorData);

    // Remove any invalid _id field that might be sent from frontend
    if (contractorData._id) {
      console.log('🔍 Removing invalid _id field from frontend:', contractorData._id);
      delete contractorData._id;
    }

    // Add timestamps
    contractorData.createdAt = new Date();
    contractorData.updatedAt = new Date();

    console.log('🔍 About to insert contractor data (without _id):', contractorData);

    const result = await db.collection('contractors').insertOne(contractorData);
    console.log('✅ Created new contractor:', result.insertedId);
    res.status(201).json({ ...contractorData, _id: result.insertedId });
  } catch (error) {
    console.error('❌ Error creating contractor:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create contractor' });
  }
});

app.put('/api/contractors/:id', async (req, res) => {
  try {
    console.log('🔍 PUT /api/contractors/:id called with ID:', req.params.id);
    console.log('🔍 Request body keys:', Object.keys(req.body));
    console.log('🔍 Request body:', req.body);

    const db = client.db('contractor-crm');

    // Remove immutable fields from update data
    const { _id, createdAt, ...updateData } = req.body;

    // קבלת הנתונים הקיימים בדאטה בייס
    let existingContractor;
    try {
      console.log('🔍 Searching for contractor with ID:', req.params.id);
      // ננסה לחפש לפי ObjectId קודם (מזהה ייחודי) - רק אם זה ObjectId תקין
      if (req.params.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(req.params.id)) {
        console.log('🔍 Trying ObjectId search first...');
        try {
          existingContractor = await db.collection('contractors').findOne({
            _id: new ObjectId(req.params.id)
          });
          console.log('🔍 Search by ObjectId result:', existingContractor ? 'Found' : 'Not found');
        } catch (objectIdError) {
          console.log('🔍 ObjectId search failed:', objectIdError.message);
        }
      }

      // אם לא נמצא, ננסה לחפש לפי companyId (מספר חברה)
      if (!existingContractor) {
        console.log('🔍 Trying companyId search...');
        existingContractor = await db.collection('contractors').findOne({
          companyId: req.params.id
        });
        console.log('🔍 Search by companyId result:', existingContractor ? 'Found' : 'Not found');
      }

      // אם עדיין לא נמצא, ננסה לחפש לפי contractorId (מספר קבלן) - רק לקבלנים
      if (!existingContractor) {
        console.log('🔍 Trying contractorId search...');
        existingContractor = await db.collection('contractors').findOne({
          contractorId: req.params.id
        });
        console.log('🔍 Search by contractorId result:', existingContractor ? 'Found' : 'Not found');
      }
    } catch (error) {
      console.log('❌ Error searching for contractor:', error.message);
      return res.status(400).json({ error: 'Invalid contractor ID format' });
    }
    if (!existingContractor) {
      console.log('❌ Contractor not found with ID:', req.params.id);
      return res.status(404).json({ error: 'Contractor not found' });
    }
    console.log('✅ Found contractor:', existingContractor.name);

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
      console.log('🔍 Attempting to update contractor with finalUpdateData:', finalUpdateData);
      // ננסה לעדכן לפי ObjectId קודם (מזהה ייחודי) - רק אם זה ObjectId תקין
      if (req.params.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(req.params.id)) {
        console.log('🔍 Trying ObjectId update first...');
        try {
          result = await db.collection('contractors').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: finalUpdateData }
          );
          console.log('🔍 Update by ObjectId result:', result);
        } catch (objectIdError) {
          console.log('🔍 ObjectId update failed:', objectIdError.message);
          result = { matchedCount: 0 };
        }
      } else {
        result = { matchedCount: 0 };
      }

      // אם לא נמצא, ננסה לפי companyId (מספר חברה)
      if (result.matchedCount === 0) {
        console.log('🔍 Trying companyId update...');
        result = await db.collection('contractors').updateOne(
          { companyId: req.params.id },
          { $set: finalUpdateData }
        );
        console.log('🔍 Update by companyId result:', result);
      }

      // אם עדיין לא נמצא, ננסה לפי contractorId (מספר קבלן) - רק לקבלנים
      if (result.matchedCount === 0) {
        console.log('🔍 Trying contractorId update...');
        result = await db.collection('contractors').updateOne(
          { contractorId: req.params.id },
          { $set: finalUpdateData }
        );
        console.log('🔍 Update by contractorId result:', result);
      }
    } catch (error) {
      console.log('❌ Error updating contractor:', error.message);
      console.log('❌ Error stack:', error.stack);
      return res.status(500).json({ error: 'Failed to update contractor' });
    }
    if (result.matchedCount === 0) {
      console.log('❌ No contractor matched for update with ID:', req.params.id);
      return res.status(404).json({ error: 'Contractor not found' });
    }
    console.log('✅ Updated contractor:', req.params.id, 'Modified count:', result.modifiedCount);

    // Return the updated contractor data without projects field
    // Use the same search logic as before to find the updated contractor
    let updatedContractor;
    try {
      // Try to find by ObjectId first (primary identifier) - only if it's a valid ObjectId
      if (req.params.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(req.params.id)) {
        try {
          updatedContractor = await db.collection('contractors').findOne({ _id: new ObjectId(req.params.id) });
        } catch (objectIdError) {
          console.log('🔍 ObjectId retrieval failed:', objectIdError.message);
        }
      }

      // If not found, try by companyId (company identifier)
      if (!updatedContractor) {
        updatedContractor = await db.collection('contractors').findOne({ companyId: req.params.id });
      }

      // If still not found, try by contractorId (contractor identifier) - only for contractors
      if (!updatedContractor) {
        updatedContractor = await db.collection('contractors').findOne({ contractorId: req.params.id });
      }
    } catch (error) {
      console.log('❌ Error finding updated contractor:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve updated contractor' });
    }

    if (!updatedContractor) {
      console.log('❌ Updated contractor not found with ID:', req.params.id);
      return res.status(404).json({ error: 'Updated contractor not found' });
    }

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
    const { contractorId, ids } = req.query;

    let query = {};

    // Handle multiple project IDs
    if (ids) {
      const projectIds = ids.split(',').map(id => new ObjectId(id.trim()));
      query._id = { $in: projectIds };
    } else if (contractorId) {
      query.mainContractor = contractorId;
    }

    const projects = await db.collection('projects').find(query).toArray();

    // Calculate correct status for each project and transform insurance coverage fields
    const projectsWithStatus = projects.map(project => {
      const status = calculateProjectStatus(project.startDate, project.durationMonths, project.isClosed);
      const projectWithStatus = { ...project, status };
      return transformInsuranceCoverageFields(projectWithStatus);
    });

    console.log('📋 Fetched', projectsWithStatus.length, 'projects for contractor:', contractorId || 'all');
    res.json(projectsWithStatus);
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// This middleware will be moved to earlier position

// Test route to verify API is working
app.get('/api/test', (req, res) => {
  console.log('🔍 TEST ROUTE HIT: /api/test');
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Get single project by ID - DEBUGGING VERSION v3.0
app.get('/api/projects/:id', async (req, res) => {
  console.log('🚨🚨🚨 PROJECT API ROUTE HIT - DEBUGGING VERSION v3.0 🚨🚨🚨');
  console.log('🔍 Request URL:', req.url);
  console.log('🔍 Project ID:', req.params.id);
  console.log('🔍 Full URL:', req.originalUrl);
  console.log('🔍 Method:', req.method);

  // Force JSON response for debugging
  res.setHeader('Content-Type', 'application/json');

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

    // Transform flat insurance coverage fields to nested structure
    console.log('🔍 Before transformation - theftCoverage:', projectWithStatus.insuranceSpecification?.theftCoverage);
    const transformedProject = transformInsuranceCoverageFields(projectWithStatus);
    console.log('🔍 After transformation - theftCoverage:', transformedProject.insuranceSpecification?.theftCoverage);

    console.log('✅ Fetched project:', transformedProject.projectName);
    console.log('🔍 Project subcontractors:', transformedProject.subcontractors);
    res.json({
      success: true,
      project: transformedProject
    });
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

    // Get contractor with project IDs - try ObjectId first, then fallback to external IDs
    let contractor = null;

    // Try ObjectId first (primary identifier)
    if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      try {
        contractor = await db.collection('contractors').findOne({ _id: new ObjectId(id) });
      } catch (objectIdError) {
        console.log('🔍 ObjectId search failed:', objectIdError.message);
      }
    }

    // If not found, try companyId (company identifier)
    if (!contractor) {
      contractor = await db.collection('contractors').findOne({ companyId: id });
    }

    // If still not found, try contractorId (contractor identifier)
    if (!contractor) {
      contractor = await db.collection('contractors').findOne({ contractor_id: id });
    }

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Get projects by IDs
    const projectIds = contractor.projectIds || [];
    const projects = await db.collection('projects').find({
      _id: { $in: projectIds.map(id => new ObjectId(id)) }
    }).toArray();

    // Transform insurance coverage fields for each project
    const transformedProjects = projects.map(project => transformInsuranceCoverageFields(project));

    console.log('📋 Fetched', transformedProjects.length, 'projects for contractor:', id);
    res.json(transformedProjects);
  } catch (error) {
    console.error('❌ Error fetching contractor projects:', error);
    res.status(500).json({ error: 'Failed to fetch contractor projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    console.log('🔍 POST /api/projects called');
    console.log('🔍 Request body keys:', Object.keys(req.body));
    console.log('🔍 Request body:', req.body);

    const db = client.db('contractor-crm');

    // Keep the data as is (now in nested structure from client)
    const projectData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('🔍 Project data to insert:', projectData);

    // Create the project
    const result = await db.collection('projects').insertOne(projectData);
    console.log('✅ Created new project:', result.insertedId);

    // Add project ID to contractor's projectIds array
    if (req.body.mainContractor) {
      console.log('🔍 Adding project ID to contractor:', req.body.mainContractor);
      console.log('🔍 mainContractor type:', typeof req.body.mainContractor);
      console.log('🔍 mainContractor length:', req.body.mainContractor?.length);

      try {
        const updateResult = await db.collection('contractors').updateOne(
          { _id: new ObjectId(req.body.mainContractor) },
          { $push: { projectIds: result.insertedId.toString() } }
        );
        console.log('✅ Added project ID to contractor:', req.body.mainContractor, 'Matched:', updateResult.matchedCount, 'Modified:', updateResult.modifiedCount);

        // Update contractor statistics automatically
        console.log('🔍 Updating contractor stats for:', req.body.mainContractor);
        await updateContractorStats(db, req.body.mainContractor);
        console.log('✅ Updated contractor stats successfully');
      } catch (contractorError) {
        console.error('❌ Error updating contractor:', contractorError);
        console.error('❌ Contractor error stack:', contractorError.stack);
        // Don't fail the main request if contractor update fails
      }
    } else {
      console.log('⚠️ No mainContractor provided in request body');
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error creating project:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    console.log('🔧 PUT /api/projects/:id called with ID:', req.params.id);
    console.log('🔧 Request body keys:', Object.keys(req.body));
    console.log('🔧 Full request body:', JSON.stringify(req.body, null, 2));

    const db = client.db('contractor-crm');

    // Keep the data as is (now in nested structure from client)
    // Separate fields to set and fields to unset
    const fieldsToSet = {};
    const fieldsToUnset = {};

    // Process each field in the request body
    for (const [key, value] of Object.entries(req.body)) {
      console.log('🔍 Processing field:', key, 'with value:', value);

      if (value === null) {
        // If value is null, we want to unset (delete) the field
        fieldsToUnset[key] = "";
        console.log('🗑️ Field to unset (delete):', key);
      } else if (key.includes('.')) {
        // This is a nested field like 'garmoshka.0.file' or 'engineeringQuestionnaire.buildingPlan.excavationPermit.file'
        console.log('🔍 Nested field detected:', key);
        fieldsToSet[key] = value;
        console.log('🔍 Added to fieldsToSet:', key, '=', value);

        // Special handling for array fields like 'garmoshka.0.file' - but we want to treat garmoshka as object
        if (key.match(/^(\w+)\.\d+\./) && key.startsWith('garmoshka.0.')) {
          // For garmoshka, treat it as an object, not an array
          const fieldName = key.split('.').slice(2).join('.');
          if (!fieldsToSet['garmoshka']) {
            fieldsToSet['garmoshka'] = {};
          }
          fieldsToSet['garmoshka'][fieldName] = value;

          // Remove the dot notation version since we're handling it as an object
          delete fieldsToSet[key];
          console.log('🔍 Converted garmoshka field to object structure');
        }
      } else {
        // This is a top-level field
        console.log('🔍 Top-level field:', key);
        fieldsToSet[key] = value;
      }
    }

    // Add updatedAt to fields to set
    fieldsToSet.updatedAt = new Date();

    console.log('🔧 Fields to set:', JSON.stringify(fieldsToSet, null, 2));
    console.log('🔧 Fields to unset:', JSON.stringify(fieldsToUnset, null, 2));

    // Build the update operation
    const updateOperation = {};
    if (Object.keys(fieldsToSet).length > 0) {
      updateOperation.$set = fieldsToSet;
    }
    if (Object.keys(fieldsToUnset).length > 0) {
      updateOperation.$unset = fieldsToUnset;
    }

    console.log('🔧 Final update operation:', JSON.stringify(updateOperation, null, 2));

    console.log('🔍 About to execute updateOne with:');
    console.log('🔍 - Filter: { _id: new ObjectId("' + req.params.id + '") }');
    console.log('🔍 - Update operation:', JSON.stringify(updateOperation, null, 2));

    const result = await db.collection('projects').updateOne(
      { _id: new ObjectId(req.params.id) },
      updateOperation
    );

    console.log('✅ Updated project:', req.params.id, 'Modified count:', result.modifiedCount);
    console.log('🔍 Full result object:', JSON.stringify(result, null, 2));

    // Update contractor statistics automatically
    if (req.body.mainContractor) {
      try {
        console.log('🔄 Attempting to update contractor stats for:', req.body.mainContractor);
        const statsResult = await updateContractorStats(db, req.body.mainContractor);
        if (statsResult) {
          console.log('✅ Contractor stats updated successfully');
        } else {
          console.log('⚠️ Contractor stats update skipped (invalid contractorId)');
        }
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
    console.log('🔄 updateContractorStats called with contractorId:', contractorId, 'type:', typeof contractorId);

    // Validate contractorId before using it
    if (!contractorId) {
      console.log('❌ No contractorId provided to updateContractorStats');
      return;
    }

    // Check if contractorId is a valid ObjectId (24 hex characters)
    let validObjectId = null;
    if (typeof contractorId === 'string' && contractorId.length === 24 && /^[0-9a-fA-F]{24}$/.test(contractorId)) {
      validObjectId = contractorId;
      console.log('✅ contractorId is valid ObjectId:', validObjectId);
    } else {
      console.log('❌ contractorId is not a valid ObjectId:', contractorId);
      return;
    }

    // Get all projects for this contractor using mainContractor field
    // mainContractor should contain the ObjectId of the contractor
    const projects = await db.collection('projects').find({
      mainContractor: validObjectId
    }).toArray();

    console.log('📊 Found', projects.length, 'projects for contractor:', validObjectId);

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
      { _id: new ObjectId(validObjectId) },
      {
        $set: {
          current_projects: currentProjects,
          current_projects_value_nis: currentProjectsValue,
          forcast_projects: futureProjects,
          forcast_projects_value_nis: futureProjectsValue
        }
      }
    );

    console.log('✅ Updated contractor stats:', validObjectId, {
      currentProjects,
      currentProjectsValue,
      futureProjects,
      futureProjectsValue,
      matchedCount: result.matchedCount
    });

    return { currentProjects, currentProjectsValue, futureProjects, futureProjectsValue };
  } catch (error) {
    console.error('❌ Error updating contractor stats:', error);
    console.error('❌ contractorId that caused error:', contractorId);
    // Don't throw the error to prevent breaking the main request
    return null;
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

// Update all contractors statistics (no auth required for maintenance)
app.post('/api/contractors/update-all-stats', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    // Get all contractors
    const contractors = await db.collection('contractors').find({}).toArray();
    console.log('📊 Updating stats for', contractors.length, 'contractors');

    const results = [];

    for (const contractor of contractors) {
      try {
        const stats = await updateContractorStats(db, contractor._id.toString());
        results.push({
          contractorId: contractor._id,
          contractorName: contractor.name,
          stats
        });
        console.log('✅ Updated stats for:', contractor.name);
      } catch (error) {
        console.error('❌ Error updating stats for contractor:', contractor.name, error);
        results.push({
          contractorId: contractor._id,
          contractorName: contractor.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Updated stats for ${results.length} contractors`,
      results
    });
  } catch (error) {
    console.error('❌ Error updating all contractor stats:', error);
    res.status(500).json({ error: 'Failed to update all contractor stats' });
  }
});

// Maintenance endpoint to update all contractor statistics (no auth required)
app.post('/api/maintenance/update-stats', async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    // Get all contractors
    const contractors = await db.collection('contractors').find({}).toArray();
    console.log('📊 Maintenance: Updating stats for', contractors.length, 'contractors');

    const results = [];

    for (const contractor of contractors) {
      try {
        const stats = await updateContractorStats(db, contractor._id.toString());
        results.push({
          contractorId: contractor._id,
          contractorName: contractor.name,
          stats
        });
        console.log('✅ Maintenance: Updated stats for:', contractor.name);
      } catch (error) {
        console.error('❌ Maintenance: Error updating stats for contractor:', contractor.name, error);
        results.push({
          contractorId: contractor._id,
          contractorName: contractor.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Maintenance: Updated stats for ${results.length} contractors`,
      results
    });
  } catch (error) {
    console.error('❌ Maintenance: Error updating all contractor stats:', error);
    res.status(500).json({ error: 'Failed to update all contractor stats' });
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

// Daily cache update for contractors registry data
app.post('/api/contractors/update-licenses-cache', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractors = await db.collection('contractors').find({
      $or: [
        { companyId: { $exists: true, $ne: '' } },
        { company_id: { $exists: true, $ne: '' } }
      ]
    }).toArray();

    console.log(`🔄 Starting daily license cache update for ${contractors.length} contractors`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const contractor of contractors) {
      try {
        const companyId = contractor.companyId || contractor.company_id;
        console.log(`🔍 Updating licenses for ${contractor.name} (${companyId})`);

        // Fetch fresh data from Contractors Registry
        const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${companyId}`);
        const contractorsData = await contractorsResponse.json();

        if (contractorsData.success && contractorsData.result.records.length > 0) {
          const licenseTypes = [];

          contractorsData.result.records.forEach((record) => {
            if (record['TEUR_ANAF'] && record['KVUTZA'] && record['SIVUG']) {
              const licenseDescription = `${record['TEUR_ANAF']} - ${record['KVUTZA']}${record['SIVUG']}`;
              licenseTypes.push({
                classification_type: record['TEUR_ANAF'],
                classification: `${record['KVUTZA']}${record['SIVUG']}`,
                description: licenseDescription,
                kod_anaf: record['KOD_ANAF'] || '',
                tarich_sug: record['TARICH_SUG'] || '',
                hekef: record['HEKEF'] || '',
                lastUpdated: new Date().toISOString()
              });
            }
          });

          // Update contractor with fresh license data
          await db.collection('contractors').updateOne(
            { _id: contractor._id },
            {
              $set: {
                classifications: licenseTypes,
                licensesLastUpdated: new Date().toISOString()
              }
            }
          );

          console.log(`✅ Updated ${contractor.name} with ${licenseTypes.length} licenses`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${contractor.name}:`, error.message);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Daily license cache update completed`,
      updatedCount,
      errorCount,
      totalProcessed: contractors.length
    });

  } catch (error) {
    console.error('❌ Error in daily license cache update:', error);
    res.status(500).json({ error: 'Failed to update license cache' });
  }
});

// Search company by company_id - check MongoDB first, then external API
app.get('/api/search-company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { force_refresh } = req.query;
    const db = client.db('contractor-crm');

    console.log('🔍 Searching for company ID:', companyId);
    console.log('🔍 Force refresh:', force_refresh);

    // First, check if company exists in MongoDB Atlas (including archived contractors)
    const existingContractor = await db.collection('contractors').findOne({
      $or: [
        { companyId: companyId },
        { company_id: companyId }
      ]
    });

    if (existingContractor) {
      console.log('✅ Found company in MongoDB Atlas:', existingContractor.name);
      if (existingContractor.isActive === false) {
        console.log('📋 Company is archived (isActive: false)');
      }

      // Check if we have cached status data that's from today
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastStatusUpdate = existingContractor.statusLastUpdated ? new Date(existingContractor.statusLastUpdated) : null;
      const isStatusDataFresh = lastStatusUpdate && lastStatusUpdate >= today; // Today only

      // Check if we have cached license data that's from today
      const lastLicenseUpdate = existingContractor.licensesLastUpdated ? new Date(existingContractor.licensesLastUpdated) : null;
      const isLicenseDataFresh = lastLicenseUpdate && lastLicenseUpdate >= today; // Today only

      // If we have fresh status data but need to update licenses, fetch licenses from API
      if (isStatusDataFresh && existingContractor.statusIndicator && !isLicenseDataFresh && !force_refresh) {
        console.log('🔄 Status data is fresh, but license data needs update - fetching licenses from API');

        try {
          // Fetch fresh license data from Contractors Registry
          const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${companyId}`);
          const contractorsData = await contractorsResponse.json();

          let licenseTypes = [];
          if (contractorsData.success && contractorsData.result.records.length > 0) {
            console.log(`📋 Processing ${contractorsData.result.records.length} license records for cache update`);

            contractorsData.result.records.forEach((record) => {
              if (record['TEUR_ANAF'] && record['KVUTZA'] && record['SIVUG']) {
                const licenseDescription = `${record['TEUR_ANAF']} - ${record['KVUTZA']}${record['SIVUG']}`;
                licenseTypes.push({
                  classification_type: record['TEUR_ANAF'],
                  classification: `${record['KVUTZA']}${record['SIVUG']}`,
                  description: licenseDescription,
                  kod_anaf: record['KOD_ANAF'] || '',
                  tarich_sug: record['TARICH_SUG'] || '',
                  hekef: record['HEKEF'] || '',
                  lastUpdated: new Date().toISOString()
                });
              }
            });

            // Update contractor with fresh license data
            await db.collection('contractors').updateOne(
              { _id: existingContractor._id },
              {
                $set: {
                  classifications: licenseTypes,
                  licensesLastUpdated: new Date().toISOString()
                }
              }
            );

            console.log(`✅ Updated ${existingContractor.name} with ${licenseTypes.length} licenses`);
          }

          // Return data with updated licenses
          return res.json({
            success: true,
            source: 'mongodb_updated',
            data: {
              // Basic company info
              name: existingContractor.name,
              nameEnglish: existingContractor.nameEnglish,
              companyType: existingContractor.companyType,
              foundationDate: existingContractor.foundationDate,
              address: existingContractor.address,
              city: existingContractor.city,
              email: existingContractor.email,
              phone: existingContractor.phone,
              contractor_id: existingContractor.contractor_id,
              // Status data
              statusIndicator: existingContractor.statusIndicator,
              statusLastUpdated: existingContractor.statusLastUpdated,
              isActive: existingContractor.isActive,
              // Complete contractor data
              employees: existingContractor.employees || existingContractor.numberOfEmployees || '',
              numberOfEmployees: existingContractor.numberOfEmployees || existingContractor.employees || '',
              contacts: existingContractor.contacts || [],
              projects: existingContractor.projects || [],
              notes: existingContractor.notes || { general: '', internal: '' },
              safetyRating: existingContractor.safetyRating || '',
              safetyExpiry: existingContractor.safetyExpiry || '',
              safetyCertificate: existingContractor.safetyCertificate || '',
              iso45001: existingContractor.iso45001 || false,
              isoExpiry: existingContractor.isoExpiry || '',
              isoCertificate: existingContractor.isoCertificate || '',
              // Updated license data
              classifications: licenseTypes,
              // All other fields
              ...existingContractor
            }
          });
        } catch (error) {
          console.error('❌ Error updating licenses:', error);
          // Fall through to return cached data even if license update failed
        }
      }

      if (isStatusDataFresh && existingContractor.statusIndicator && isLicenseDataFresh && !force_refresh) {
        console.log('✅ Using cached status data (from today)');
        return res.json({
          success: true,
          source: 'mongodb_cached',
          data: {
            // Basic company info
            name: existingContractor.name,
            nameEnglish: existingContractor.nameEnglish,
            companyType: existingContractor.companyType,
            foundationDate: existingContractor.foundationDate,
            address: existingContractor.address,
            city: existingContractor.city,
            email: existingContractor.email,
            phone: existingContractor.phone,
            contractor_id: existingContractor.contractor_id,
            // Status data
            statusIndicator: existingContractor.statusIndicator,
            statusLastUpdated: existingContractor.statusLastUpdated,
            isActive: existingContractor.isActive,
            // Complete contractor data
            employees: existingContractor.employees || existingContractor.numberOfEmployees || '',
            numberOfEmployees: existingContractor.numberOfEmployees || existingContractor.employees || '',
            contacts: existingContractor.contacts || [],
            projects: existingContractor.projects || [],
            notes: existingContractor.notes || { general: '', internal: '' },
            safetyRating: existingContractor.safetyRating || '',
            safetyExpiry: existingContractor.safetyExpiry || '',
            safetyCertificate: existingContractor.safetyCertificate || '',
            iso45001: existingContractor.iso45001 || false,
            isoExpiry: existingContractor.isoExpiry || '',
            isoCertificate: existingContractor.isoCertificate || '',
            // All other fields
            ...existingContractor
          }
        });
      }

      // Fetch fresh data from Companies Registry for status indicator and Contractors Registry for licenses
      try {
        console.log('🔄 Fetching fresh status data from Companies Registry API');
        const companiesResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3176f9a054&q=${companyId}`);
        const companiesData = await companiesResponse.json();

        console.log('🔄 Fetching fresh license data from Contractors Registry API');
        const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${companyId}`);
        const contractorsData = await contractorsResponse.json();

        let statusIndicator = '';
        let statusData = {};

        if (companiesData.success && companiesData.result.records.length > 0) {
          const companyData = companiesData.result.records[0];
          statusIndicator = getCompanyStatusIndicator(
            companyData['סטטוס חברה'] || '',
            companyData['מפרה'] || '',
            companyData['שנה אחרונה של דוח שנתי (שהוגש)'] || '',
            mapCompanyTypeFromAPI(companyData['סוג תאגיד']) || getCompanyTypeFromId(companyId)
          );

          // Store status data for caching
          statusData = {
            statusIndicator: statusIndicator,
            statusLastUpdated: now.toISOString(),
            companyStatus: companyData['סטטוס חברה'] || '',
            violations: companyData['מפרה'] || '',
            lastAnnualReport: companyData['שנה אחרונה של דוח שנתי (שהוגש)'] || ''
          };

          // Update the contractor document with fresh status data
          await db.collection('contractors').updateOne(
            { $or: [{ companyId: companyId }, { company_id: companyId }] },
            { $set: statusData }
          );

          console.log('✅ Updated contractor with fresh status data:', statusData);
        }

        // Process license data from Contractors Registry
        let licenseTypes = [];
        if (contractorsData.success && contractorsData.result.records.length > 0) {
          console.log(`📋 Processing ${contractorsData.result.records.length} license records for fresh data`);

          contractorsData.result.records.forEach((record) => {
            if (record['TEUR_ANAF'] && record['KVUTZA'] && record['SIVUG']) {
              const licenseDescription = `${record['TEUR_ANAF']} - ${record['KVUTZA']}${record['SIVUG']}`;
              licenseTypes.push({
                classification_type: record['TEUR_ANAF'],
                classification: `${record['KVUTZA']}${record['SIVUG']}`,
                description: licenseDescription,
                kod_anaf: record['KOD_ANAF'] || '',
                tarich_sug: record['TARICH_SUG'] || '',
                hekef: record['HEKEF'] || '',
                lastUpdated: new Date().toISOString()
              });
            }
          });

          // Update contractor with fresh license data
          await db.collection('contractors').updateOne(
            { $or: [{ companyId: companyId }, { company_id: companyId }] },
            {
              $set: {
                classifications: licenseTypes,
                licensesLastUpdated: new Date().toISOString()
              }
            }
          );

          console.log(`✅ Updated ${existingContractor.name} with ${licenseTypes.length} licenses`);
        }

        return res.json({
          success: true,
          source: 'mongodb_updated',
          data: {
            // Basic company info
            name: existingContractor.name,
            nameEnglish: existingContractor.nameEnglish,
            companyType: existingContractor.companyType,
            foundationDate: existingContractor.foundationDate,
            address: existingContractor.address,
            city: existingContractor.city,
            email: existingContractor.email,
            phone: existingContractor.phone,
            contractor_id: existingContractor.contractor_id,
            // Status data
            statusIndicator: statusIndicator,
            statusLastUpdated: statusData.statusLastUpdated,
            isActive: existingContractor.isActive,
            // Complete contractor data
            employees: existingContractor.employees || existingContractor.numberOfEmployees || '',
            numberOfEmployees: existingContractor.numberOfEmployees || existingContractor.employees || '',
            contacts: existingContractor.contacts || [],
            projects: existingContractor.projects || [],
            notes: existingContractor.notes || { general: '', internal: '' },
            safetyRating: existingContractor.safetyRating || '',
            safetyExpiry: existingContractor.safetyExpiry || '',
            safetyCertificate: existingContractor.safetyCertificate || '',
            iso45001: existingContractor.iso45001 || false,
            isoExpiry: existingContractor.isoExpiry || '',
            isoCertificate: existingContractor.isoCertificate || '',
            // License data from Contractors Registry
            classifications: licenseTypes,
            // All other fields
            ...existingContractor
          }
        });
      } catch (error) {
        console.error('Error fetching status for existing contractor:', error);
        // Return existing contractor data without status indicator
        return res.json({
          success: true,
          source: 'mongodb',
          data: {
            // Basic company info
            name: existingContractor.name,
            nameEnglish: existingContractor.nameEnglish,
            companyType: existingContractor.companyType,
            foundationDate: existingContractor.foundationDate,
            address: existingContractor.address,
            city: existingContractor.city,
            email: existingContractor.email,
            phone: existingContractor.phone,
            contractor_id: existingContractor.contractor_id,
            // Status data
            statusIndicator: existingContractor.statusIndicator || '',
            statusLastUpdated: existingContractor.statusLastUpdated,
            // Complete contractor data
            employees: existingContractor.employees || existingContractor.numberOfEmployees || '',
            numberOfEmployees: existingContractor.numberOfEmployees || existingContractor.employees || '',
            contacts: existingContractor.contacts || [],
            projects: existingContractor.projects || [],
            notes: existingContractor.notes || { general: '', internal: '' },
            safetyRating: existingContractor.safetyRating || '',
            safetyExpiry: existingContractor.safetyExpiry || '',
            safetyCertificate: existingContractor.safetyCertificate || '',
            iso45001: existingContractor.iso45001 || false,
            isoExpiry: existingContractor.isoExpiry || '',
            isoCertificate: existingContractor.isoCertificate || '',
            // All other fields
            ...existingContractor
          }
        });
      }
    }

    // If force_refresh is true for existing contractor, fetch fresh data from external APIs
    if (existingContractor && force_refresh) {
      console.log('🔄 Force refresh requested for existing contractor - fetching fresh data from external APIs');

      // Fetch fresh data from both APIs
      const companiesResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3176f9a054&q=${companyId}`);
      const companiesData = await companiesResponse.json();

      const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${companyId}`);
      const contractorsData = await contractorsResponse.json();

      console.log('📋 Contractors Registry API response:', {
        success: contractorsData.success,
        recordsCount: contractorsData.result?.records?.length || 0,
        total: contractorsData.result?.total || 0
      });

      if (companiesData.success && companiesData.result.records.length > 0) {
        const companyData = companiesData.result.records[0];
        const contractorData = contractorsData.success && contractorsData.result.records.length > 0
          ? contractorsData.result.records[0]
          : null;

        console.log('✅ Found company in Companies Registry:', companyData['שם חברה']);

        // Extract contractor data from Contractors Registry
        let contractorId = '';
        let phone = '';
        let email = '';
        let licenseTypes = [];

        if (contractorData) {
          contractorId = contractorData['MISPAR_KABLAN'] || '';

          // Format phone number - add 0 prefix if needed
          const rawPhone = contractorData['MISPAR_TEL'] || '';
          if (rawPhone && !rawPhone.startsWith('0')) {
            phone = '0' + rawPhone;
          } else {
            phone = rawPhone;
          }

          email = contractorData['EMAIL'] || '';

          // Extract website domain from email
          let website = '';
          if (email && email.includes('@')) {
            const domain = email.split('@')[1];
            if (domain) {
              website = `https://www.${domain}`;
            }
          }

          // Extract license types
          if (contractorsData.result.records.length > 0) {
            licenseTypes = contractorsData.result.records.map(record => {
              if (record['TEUR_ANAF'] && record['KVUTZA'] && record['SIVUG']) {
                const licenseDescription = `${record['TEUR_ANAF']} - ${record['KVUTZA']}${record['SIVUG']}`;
                return {
                  classification_type: record['TEUR_ANAF'],
                  classification: `${record['KVUTZA']}${record['SIVUG']}`,
                  description: licenseDescription,
                  kod_anaf: record['KOD_ANAF'] || '',
                  tarich_sug: record['TARICH_SUG'] || '',
                  hekef: record['HEKEF'] || ''
                };
              }
              return null;
            }).filter(Boolean);
          }
        }

        // Prepare response data
        const responseData = {
          // Basic company info
          name: companyData['שם חברה'] || existingContractor.name,
          nameEnglish: companyData['שם חברה באנגלית'] || existingContractor.nameEnglish,
          companyType: companyData['סוג חברה'] || existingContractor.companyType,
          foundationDate: companyData['תאריך התאגדות'] || existingContractor.foundationDate,
          address: companyData['כתובת'] || existingContractor.address,
          city: companyData['עיר'] || existingContractor.city,
          email: email || existingContractor.email,
          phone: phone || existingContractor.phone,
          website: website || existingContractor.website,
          contractor_id: contractorId || existingContractor.contractor_id,
          // Status data
          statusIndicator: existingContractor.statusIndicator || '',
          statusLastUpdated: existingContractor.statusLastUpdated,
          // Complete contractor data
          employees: existingContractor.employees || existingContractor.numberOfEmployees || '',
          numberOfEmployees: existingContractor.numberOfEmployees || existingContractor.employees || '',
          contacts: existingContractor.contacts || [],
          projects: existingContractor.projects || [],
          notes: existingContractor.notes || { general: '', internal: '' },
          safetyRating: existingContractor.safetyRating || '',
          safetyExpiry: existingContractor.safetyExpiry || '',
          safetyCertificate: existingContractor.safetyCertificate || '',
          iso45001: existingContractor.iso45001 || false,
          isoExpiry: existingContractor.isoExpiry || '',
          isoCertificate: existingContractor.isoCertificate || '',
          // License types from Contractors Registry
          classifications: licenseTypes,
          // All other fields
          ...existingContractor
        };

        return res.json({
          success: true,
          source: 'api_refresh',
          data: responseData
        });
      }
    }

    // If not found in MongoDB, search in Companies Registry API
    console.log('🔍 Company not found in MongoDB, searching Companies Registry API...');

    const companiesResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3176f9a054&q=${companyId}`);
    const companiesData = await companiesResponse.json();

    const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${companyId}`);
    const contractorsData = await contractorsResponse.json();

    console.log('📋 Contractors Registry API response:', {
      success: contractorsData.success,
      recordsCount: contractorsData.result?.records?.length || 0,
      total: contractorsData.result?.total || 0
    });

    if (companiesData.success && companiesData.result.records.length > 0) {
      const companyData = companiesData.result.records[0];
      const contractorData = contractorsData.success && contractorsData.result.records.length > 0
        ? contractorsData.result.records[0]
        : null;

      console.log('✅ Found company in Companies Registry:', companyData['שם חברה']);

      // Extract contractor data from Contractors Registry
      let contractorId = '';
      let phone = '';
      let email = '';
      let website = '';
      let licenseTypes = [];

      if (contractorData) {
        contractorId = contractorData['MISPAR_KABLAN'] || '';

        // Format phone number - add 0 prefix if needed
        const rawPhone = contractorData['MISPAR_TEL'] || '';
        if (rawPhone && !rawPhone.startsWith('0')) {
          phone = '0' + rawPhone;
        } else {
          phone = rawPhone;
        }

        email = contractorData['EMAIL'] || '';

        // Extract website domain from email
        if (email && email.includes('@')) {
          const domain = email.split('@')[1];
          if (domain) {
            website = `https://www.${domain}`;
          }
        }
      }

      // Extract ALL license types from contractors registry (multiple records)
      if (contractorsData.success && contractorsData.result.records.length > 0) {
        console.log(`📋 Processing ${contractorsData.result.records.length} license records`);

        contractorsData.result.records.forEach((record, index) => {
          if (record['TEUR_ANAF'] && record['KVUTZA'] && record['SIVUG']) {
            const licenseDescription = `${record['TEUR_ANAF']} - ${record['KVUTZA']}${record['SIVUG']}`;
            licenseTypes.push({
              classification_type: record['TEUR_ANAF'],
              classification: `${record['KVUTZA']}${record['SIVUG']}`,
              description: licenseDescription,
              kod_anaf: record['KOD_ANAF'] || '',
              tarich_sug: record['TARICH_SUG'] || '',
              hekef: record['HEKEF'] || ''
            });
            console.log(`📋 License ${index + 1}: ${licenseDescription}`);
          }
        });

        console.log('📋 Extracted contractor data:', {
          contractorId,
          phone: phone,
          email,
          licenseTypes
        });
      }

      const responseData = {
        name: companyData['שם חברה'] || '',
        nameEnglish: companyData['שם באנגלית'] || '',
        companyType: mapCompanyTypeFromAPI(companyData['סוג תאגיד']) || getCompanyTypeFromId(companyId), // API data takes priority
        foundationDate: formatDateForInput(companyData['תאריך התאגדות'] || ''),
        address: `${companyData['שם רחוב'] || ''} ${companyData['מספר בית'] || ''}`.trim(),
        city: companyData['שם עיר'] || '',
        email: email,
        phone: phone,
        website: website,
        companyId: companyId, // Add companyId to response
        company_id: companyId, // Also add old field for backward compatibility
        contractorId: contractorId,
        contractor_id: contractorId,
        // License types from contractors registry
        classifications: licenseTypes,
        // Company status data for indicator
        companyStatus: companyData['סטטוס חברה'] || '',
        violations: companyData['מפרה'] || '',
        lastAnnualReport: companyData['שנה אחרונה של דוח שנתי (שהוגש)'] || '',
        statusIndicator: getCompanyStatusIndicator(
          companyData['סטטוס חברה'] || '',
          companyData['מפרה'] || '',
          companyData['שנה אחרונה של דוח שנתי (שהוגש)'] || '',
          mapCompanyTypeFromAPI(companyData['סוג תאגיד']) || getCompanyTypeFromId(companyId)
        )
      }

      console.log('🔍 Sending response data:', responseData);
      console.log('🔍 Response companyId:', responseData.companyId);
      console.log('🔍 Response company_id:', responseData.company_id);

      return res.json({
        success: true,
        source: 'companies_registry',
        data: responseData
      });
    }

    // If not found in Companies Registry, try Contractors Registry only
    if (contractorsData.success && contractorsData.result.records.length > 0) {
      const contractorData = contractorsData.result.records[0];

      console.log('✅ Found contractor in Contractors Registry:', contractorData['SHEM_YESHUT']);

      // Extract contractor data
      const contractorId = contractorData['MISPAR_KABLAN'] || '';

      // Format phone number - add 0 prefix if needed
      const rawPhone = contractorData['MISPAR_TEL'] || '';
      let phone = '';
      if (rawPhone && !rawPhone.startsWith('0')) {
        phone = '0' + rawPhone;
      } else {
        phone = rawPhone;
      }

      const email = contractorData['EMAIL'] || '';
      const contractorName = contractorData['SHEM_YESHUT'] || '';
      const city = contractorData['SHEM_YISHUV'] || '';
      const address = `${contractorData['SHEM_REHOV'] || ''} ${contractorData['MISPAR_BAIT'] || ''}`.trim();

      // Extract website domain from email
      let website = '';
      if (email && email.includes('@')) {
        const domain = email.split('@')[1];
        if (domain) {
          website = `https://www.${domain}`;
        }
      }

      // Extract ALL license types from contractors registry (multiple records)
      let licenseTypes = [];
      if (contractorsData.success && contractorsData.result.records.length > 0) {
        console.log(`📋 Processing ${contractorsData.result.records.length} license records (contractor-only)`);

        contractorsData.result.records.forEach((record, index) => {
          if (record['TEUR_ANAF'] && record['KVUTZA'] && record['SIVUG']) {
            const licenseDescription = `${record['TEUR_ANAF']} - ${record['KVUTZA']}${record['SIVUG']}`;
            licenseTypes.push({
              classification_type: record['TEUR_ANAF'],
              classification: `${record['KVUTZA']}${record['SIVUG']}`,
              description: licenseDescription,
              kod_anaf: record['KOD_ANAF'] || '',
              tarich_sug: record['TARICH_SUG'] || '',
              hekef: record['HEKEF'] || ''
            });
            console.log(`📋 License ${index + 1}: ${licenseDescription}`);
          }
        });
      }

      console.log('📋 Extracted contractor-only data:', {
        contractorId,
        phone: phone,
        email,
        name: contractorName,
        city,
        address,
        licenseTypes
      });

      return res.json({
        success: true,
        source: 'contractors_registry_only',
        data: {
          name: contractorName,
          nameEnglish: '',
          companyType: getCompanyTypeFromId(companyId), // Use prefix logic
          foundationDate: '',
          address: address,
          city: city,
          email: email,
          phone: phone,
          website: website,
          contractor_id: contractorId,
          // License types from contractors registry
          classifications: licenseTypes,
          // No company status data available from contractors registry
          companyStatus: '',
          violations: '',
          lastAnnualReport: '',
          statusIndicator: ''
        }
      });
    }

    // Company not found in either source
    console.log('❌ Company not found in any source');
    return res.json({
      success: false,
      message: 'Company not found'
    });

  } catch (error) {
    console.error('❌ Error searching for company:', error);
    res.status(500).json({ error: 'Failed to search for company' });
  }
});

// Helper function to determine company type from company ID
function getCompanyTypeFromId(companyId) {
  if (!companyId || companyId.length < 2) return 'authorized_dealer';
  const prefix = companyId.substring(0, 2);
  switch (prefix) {
    case '51': return 'private_company';
    case '52': return 'public_company';
    case '57': return 'cooperative';
    default: return 'authorized_dealer';
  }
}

// Helper function to map company type from API to English value
function mapCompanyTypeFromAPI(apiCompanyType) {
  if (!apiCompanyType) return 'private_company';

  const type = apiCompanyType.toLowerCase();
  if (type.includes('ישראלית חברה פרטית') || type.includes('חברה פרטית')) {
    return 'private_company';
  } else if (type.includes('ישראלית חברה ציבורית') || type.includes('חברה ציבורית')) {
    return 'public_company';
  } else if (type.includes('אגודה שיתופית')) {
    return 'cooperative';
  } else if (type.includes('עוסק מורשה')) {
    return 'authorized_dealer';
  } else if (type.includes('עוסק פטור')) {
    return 'exempt_dealer';
  } else {
    return 'private_company'; // Default fallback
  }
}

// Helper function to format date for HTML input (YYYY-MM-DD)
function formatDateForInput(dateString) {
  if (!dateString) return '';

  try {
    // Handle different date formats from the API
    // Format: "22/10/1995" -> "1995-10-22"
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }

    // If already in YYYY-MM-DD format, return as is
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }

    // Try to parse as Date object
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return '';
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

// Helper function to determine company status indicator
function getCompanyStatusIndicator(companyStatus, violations, lastAnnualReport, companyType) {
  const currentYear = new Date().getFullYear();

  // 🔴 Red: Company status is not "פעילה" (Active)
  if (companyStatus && companyStatus !== 'פעילה') {
    return '🔴';
  }

  // 🟡 Yellow: Has violations
  if (violations && violations.trim() !== '') {
    return '🟡';
  }

  // For public companies, ignore annual report year (they report to stock exchange, not companies register)
  const isPublicCompany = companyType === 'public_company' ||
    (companyType && companyType.toLowerCase().includes('ציבורית'));

  if (!isPublicCompany && lastAnnualReport) {
    const reportYear = parseInt(lastAnnualReport);
    if (!isNaN(reportYear) && (currentYear - reportYear) > 2) {
      return '🟡';
    }
  }

  // 🟢 Green: All good - active status, no violations, and either:
  // - For public companies: just active status and no violations
  // - For other companies: also recent annual report
  if (companyStatus === 'פעילה' && (!violations || violations.trim() === '')) {
    if (isPublicCompany) {
      return '🟢'; // Public companies don't need annual report check
    } else if (lastAnnualReport &&
      !isNaN(parseInt(lastAnnualReport)) &&
      (currentYear - parseInt(lastAnnualReport)) <= 2) {
      return '🟢'; // Other companies need recent annual report
    }
  }

  // No indicator if no data
  return '';
}

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
      const companyId = contractor.companyId || contractor.company_id;
      console.log(`  - ID: ${contractor._id}, Name: "${contractor.name}", Company ID: ${companyId}`);
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
        companyId: c.companyId || c.company_id
      }))
    });

  } catch (error) {
    console.error('❌ Error cleaning up contractors:', error);
    res.status(500).json({ error: 'Failed to cleanup contractors' });
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

// Removed duplicate route - using the one below with proper auth

// Update contractor details (only for contact managers)
app.put('/api/contact/contractor/:id', requireContactAuth, requireContactManager, requireContactContractorAccess, async (req, res) => {
  try {
    const db = client.db('contractor-crm');

    // Remove immutable fields from update data
    const { _id, createdAt, ...updateData } = req.body;

    const result = await db.collection('contractors').updateOne(
      {
        $or: [
          { contractorId: req.params.id },
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
    console.log('🔧 PUT /api/contact/projects/:id called with ID:', req.params.id);
    console.log('🔧 Contact user:', req.session.contactUser);
    console.log('🔧 Request body keys:', Object.keys(req.body));
    console.log('🔧 Full request body:', JSON.stringify(req.body, null, 2));

    const db = client.db('contractor-crm');
    const contractorId = req.session.contactUser.contractorId;

    // Verify project belongs to this contractor
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(req.params.id),
      mainContractor: contractorId
    });

    if (!project) {
      console.log('❌ Project not found or access denied for contractor:', contractorId);
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Keep the data as is (now in nested structure from client)
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    console.log('🔧 Update data to be saved:', JSON.stringify(updateData, null, 2));

    const result = await db.collection('projects').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    console.log('✅ Updated project via contact API:', req.params.id, 'Modified count:', result.modifiedCount);

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

// Serve static files from public directory AFTER all API routes
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all handler: send back React's index.html file for any non-API routes
// Temporarily disabled due to path-to-regexp issues
// app.get('/*', (req, res) => {
//   console.log('🚨🚨🚨 CATCH-ALL ROUTE HIT - DEBUGGING VERSION 🚨🚨🚨');
//   console.log('🔍 Request URL:', req.url);
//   console.log('🔍 Request method:', req.method);
//   console.log('🔍 Full URL:', req.originalUrl);
//   console.log('🔍 Base URL:', req.baseUrl);
//   
//   // Don't catch API routes - this should never happen
//   if (req.url.startsWith('/api/')) {
//     console.log('❌❌❌ CATCH-ALL: API route should not be caught!', req.url);
//     console.log('❌❌❌ This indicates a routing problem!');
//     res.setHeader('Content-Type', 'application/json');
//     return res.status(404).json({ error: 'API route not found - routing problem', url: req.url });
//   }
//   
//   console.log('🔍 Sending React index.html for:', req.url);
//   res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
// });

connectDB().then(() => {
  // Setup safety monitoring cron job
  const safetyService = new SafetyMonitorService();
  safetyService.initialize().then(() => {
    console.log('✅ Safety Monitor Service initialized');

    // Schedule daily safety report fetch at 7:00 AM Israel time
    const cronSchedule = process.env.SAFETY_CRON_SCHEDULE || '0 7 * * *';
    cron.schedule(cronSchedule, async () => {
      try {
        console.log('🕐 Running scheduled safety report fetch...');
        await safetyService.fetchAndProcessReports();
        console.log('✅ Scheduled safety report fetch completed');
      } catch (error) {
        console.error('❌ Error in scheduled safety report fetch:', error);
      }
    }, {
      timezone: "Asia/Jerusalem"
    });

    console.log(`⏰ Safety monitoring cron job scheduled: ${cronSchedule} (Israel time)`);
  }).catch(error => {
    console.error('❌ Failed to initialize Safety Monitor Service:', error);
  });

  app.listen(PORT, () => {
    console.log('🚨🚨🚨 SERVER STARTING - DEBUGGING VERSION v3.0 🚨🚨🚨');
    console.log('🚀 Server running on port', PORT);
    console.log('🏥 Health check: http://localhost:' + PORT + '/api/health');
    console.log('📋 Projects API: http://localhost:' + PORT + '/api/projects');
    console.log('👥 Contact Auth API: http://localhost:' + PORT + '/api/contact-auth');
    console.log('🔍 Test API: http://localhost:' + PORT + '/api/test');
    console.log('🛡️ Safety Reports API: http://localhost:' + PORT + '/api/safety-reports');
    console.log('🚨 DEBUGGING: All API routes should work now!');
  });
});

// Users come from database only

// Removed hardcoded user creation endpoint - users come from database only

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// Rate limiting for scraping endpoint (more restrictive)
const scrapingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 scraping requests per 5 minutes
  message: {
    error: 'Too many scraping requests. Please wait before trying again.',
    retryAfter: '5 minutes'
  }
});

// Upload certificate file using GridFS
app.post('/api/upload-certificate', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { type, companyId, contractorId } = req.body;

    if (!type || !companyId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Create filename
    const timestamp = Date.now();
    const extension = path.extname(req.file.originalname);
    const filename = `${type}-${companyId}-${timestamp}${extension}`;

    // Store file in GridFS
    const db = client.db('contractor-crm');
    const bucket = new GridFSBucket(db, { bucketName: 'certificates' });

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        type: type,
        companyId: companyId,
        contractorId: contractorId,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        uploadDate: new Date()
      }
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('error', (error) => {
      console.error('GridFS upload error:', error);
      res.status(500).json({ success: false, message: 'Error uploading file to database' });
    });

    uploadStream.on('finish', async () => {
      try {
        // Create file URL for GridFS
        const fileUrl = `/api/certificates/${uploadStream.id}`;

        // Update contractor in database with file URL
        const updateField = type === 'safety' ? 'safetyCertificate' : 'isoCertificate';
        const result = await db.collection('contractors').updateOne(
          { _id: new ObjectId(contractorId) },
          {
            $set: {
              [updateField]: fileUrl,
              [`${updateField}UploadDate`]: new Date().toISOString()
            }
          }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({ success: false, message: 'Contractor not found' });
        }

        res.json({
          success: true,
          fileUrl: fileUrl,
          message: 'File uploaded successfully'
        });
      } catch (error) {
        console.error('Error updating contractor:', error);
        res.status(500).json({ success: false, message: 'Error updating contractor' });
      }
    });

  } catch (error) {
    console.error('Error uploading certificate:', error);
    res.status(500).json({ success: false, message: 'Error uploading file' });
  }
});

// Serve certificate files from GridFS
app.get('/api/certificates/:id', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const bucket = new GridFSBucket(db, { bucketName: 'certificates' });

    const fileId = new ObjectId(req.params.id);
    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on('error', (error) => {
      console.error('GridFS download error:', error);
      res.status(404).json({ success: false, message: 'File not found' });
    });

    downloadStream.on('data', (chunk) => {
      res.write(chunk);
    });

    downloadStream.on('end', () => {
      res.end();
    });

    // Set appropriate headers
    downloadStream.on('file', (file) => {
      res.set({
        'Content-Type': file.metadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${file.metadata?.originalName || file.filename}"`
      });
    });

  } catch (error) {
    console.error('Error serving certificate:', error);
    res.status(500).json({ success: false, message: 'Error serving file' });
  }
});

// Scrape company information from website (GET endpoint for company ID)
app.get('/api/scrape-company-info/:companyId', scrapingLimiter, async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    console.log('🌐 Scraping company info for company ID:', companyId);

    // For now, return fallback data since we don't have website URL
    const fallbackLogo = `/assets/logo.svg`; // Use local logo instead of external placeholder

    res.json({
      success: true,
      about: `מידע על החברה ${companyId} - לא ניתן לגשת למידע באתר החברה כרגע.`,
      logo: fallbackLogo
    });
  } catch (error) {
    console.error('❌ Error in GET scrape-company-info:', error);
    res.json({
      success: true,
      about: `מידע על החברה ${req.params.companyId} - שגיאה בגישה לאתר החברה.`,
      logo: `/assets/logo.svg` // Use local logo instead of external placeholder
    });
  }
});

// Scrape company information from website (POST endpoint for website URL)
app.post('/api/scrape-company-info', scrapingLimiter, async (req, res) => {
  let browser = null;
  try {
    const { website } = req.body;

    if (!website) {
      return res.status(400).json({ error: 'Website URL is required' });
    }

    console.log('🌐 Scraping company info from:', website);

    // Import puppeteer dynamically only in development
    let puppeteer;
    if (process.env.NODE_ENV !== 'production') {
      try {
        puppeteer = require('puppeteer');
      } catch (error) {
        console.log('Puppeteer not available:', error.message);
        throw new Error('Puppeteer not available in production');
      }
    } else {
      throw new Error('Web scraping not available in production');
    }

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Navigate to the website
    await page.goto(website, { waitUntil: 'networkidle2', timeout: 10000 });

    // Extract company information
    const companyInfo = await page.evaluate(() => {
      const result = {
        about: '',
        logo: ''
      };

      // Try to find about page links
      const aboutLinks = Array.from(document.querySelectorAll('a')).filter(link => {
        const text = link.textContent.toLowerCase();
        const href = link.href.toLowerCase();
        return text.includes('about') || text.includes('אודות') ||
          text.includes('company') || text.includes('חברה') ||
          href.includes('about') || href.includes('אודות');
      });

      // Try to find logo
      const logoSelectors = [
        'img[alt*="logo" i]',
        'img[src*="logo" i]',
        'img[class*="logo" i]',
        'img[id*="logo" i]',
        '.logo img',
        '#logo img',
        'header img',
        '.header img',
        'nav img'
      ];

      for (const selector of logoSelectors) {
        const logoImg = document.querySelector(selector);
        if (logoImg && logoImg.src) {
          result.logo = logoImg.src;
          break;
        }
      }

      // Try to find company description on current page
      const descriptionSelectors = [
        'meta[name="description"]',
        'meta[property="og:description"]',
        '.about',
        '.company-description',
        '.intro',
        'p'
      ];

      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          let text = '';
          if (element.tagName === 'META') {
            text = element.content || '';
          } else {
            text = element.textContent || '';
          }

          if (text.length > 50 && text.length < 500) {
            result.about = text.trim();
            break;
          }
        }
      }

      return result;
    });

    // If we found about links, try to scrape the about page
    if (!companyInfo.about) {
      try {
        const aboutLinks = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a')).map(link => ({
            text: link.textContent.toLowerCase(),
            href: link.href
          })).filter(link =>
            link.text.includes('about') || link.text.includes('אודות') ||
            link.text.includes('company') || link.text.includes('חברה') ||
            link.href.includes('about') || link.href.includes('אודות')
          ).slice(0, 3); // Take first 3 about links
        });

        for (const aboutLink of aboutLinks) {
          try {
            await page.goto(aboutLink.href, { waitUntil: 'networkidle2', timeout: 5000 });

            const aboutInfo = await page.evaluate(() => {
              const paragraphs = Array.from(document.querySelectorAll('p'));
              for (const p of paragraphs) {
                const text = p.textContent.trim();
                if (text.length > 100 && text.length < 1000) {
                  return text;
                }
              }
              return '';
            });

            if (aboutInfo) {
              companyInfo.about = aboutInfo;
              break;
            }
          } catch (e) {
            console.log('Failed to scrape about page:', aboutLink.href);
          }
        }
      } catch (e) {
        console.log('Failed to find about pages');
      }
    }

    // If still no about info, try to get any meaningful text
    if (!companyInfo.about) {
      const fallbackText = await page.evaluate(() => {
        const paragraphs = Array.from(document.querySelectorAll('p, div, span'));
        for (const element of paragraphs) {
          const text = element.textContent.trim();
          if (text.length > 50 && text.length < 300 &&
            !text.includes('©') && !text.includes('כל הזכויות') &&
            !text.includes('privacy') && !text.includes('terms')) {
            return text;
          }
        }
        return '';
      });

      if (fallbackText) {
        companyInfo.about = fallbackText;
      }
    }

    // Clean up the about text
    if (companyInfo.about) {
      companyInfo.about = companyInfo.about
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim()
        .substring(0, 500); // Limit to 500 characters
    }

    // If no logo found, use local logo
    if (!companyInfo.logo) {
      companyInfo.logo = `/assets/logo.svg`; // Use local logo instead of external placeholder
    }

    console.log('✅ Company info scraped successfully:', {
      about: companyInfo.about ? companyInfo.about.substring(0, 100) + '...' : 'No about info',
      logo: companyInfo.logo
    });

    res.json({
      success: true,
      about: companyInfo.about || `מידע על החברה ${website} - לא נמצא מידע זמין באתר החברה.`,
      logo: companyInfo.logo
    });

  } catch (error) {
    console.error('❌ Error scraping company info:', error);

    // Check if it's a puppeteer/browser error (common in production)
    if (error.message.includes('puppeteer') || error.message.includes('browser') || error.message.includes('launch') ||
      error.message.includes('timeout') || error.message.includes('navigation') || error.message.includes('net::')) {
      console.log('🌐 Puppeteer/Network error, returning fallback');

      // Fallback: return basic info without scraping
      const fallbackLogo = `/assets/logo.svg`; // Use local logo instead of external placeholder

      res.json({
        success: true,
        about: `מידע על החברה ${website} - לא ניתן לגשת למידע באתר החברה כרגע.`,
        logo: fallbackLogo
      });
    } else {
      // For other errors, also return fallback instead of 500
      console.log('🌐 General error, returning fallback instead of 500');

      const fallbackLogo = `/assets/logo.svg`; // Use local logo instead of external placeholder

      res.json({
        success: true,
        about: `מידע על החברה ${website} - שגיאה בגישה לאתר החברה.`,
        logo: fallbackLogo
      });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Force server restart
app.get('/restart', (req, res) => {
  res.json({ message: 'Server restart requested', timestamp: new Date().toISOString() });
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Removed duplicate debug endpoint

// Server is already started in connectDB().then() above

