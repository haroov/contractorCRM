import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

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
    // Use MongoDB Memory Server for local development
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    client = new MongoClient(mongoUri);
    await client.connect();

    console.log('✅ Connected to MongoDB Memory Server');
    console.log('📊 Database URI:', mongoUri);

    // Create some sample data
    await createSampleData();

  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

async function createSampleData() {
  try {
    const db = client.db('contractor-crm');

    // Create sample contractors if collection is empty
    const existingContractors = await db.collection('contractors').countDocuments();
    if (existingContractors === 0) {
      const sampleContractors = [
        {
          contractor_id: 'sample-contractor-1',
          company_id: '123456789',
          name: 'קבלן בנייה איכותי בע"מ',
          nameEnglish: 'Quality Construction Contractor Ltd',
          companyType: 'בע"מ',
          numberOfEmployees: 150,
          foundationDate: '2010-01-15',
          city: 'תל אביב',
          address: 'רחוב הרצל 123, תל אביב',
          email: 'info@quality-construction.co.il',
          phone: '03-1234567',
          website: 'www.quality-construction.co.il',
          sector: 'בנייה',
          segment: 'קבלן ראשי',
          activityType: 'בנייה והנדסה',
          description: 'חברת בנייה מובילה המתמחה בבניית מבני מגורים ומסחר',
          safetyStars: 4,
          iso45001: true,
          activities: [
            { id: '1', activity_type: 'בנייה', classification: 'קבלן ראשי' },
            { id: '2', activity_type: 'הנדסה', classification: 'תכנון' }
          ],
          management_contacts: [
            {
              id: '1',
              fullName: 'דוד כהן',
              role: 'מנכ"ל',
              email: 'david@quality-construction.co.il',
              mobile: '050-1234567',
              permissions: 'full'
            }
          ],
          projects: [],
          notes: 'קבלן אמין עם ניסיון רב',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          contractor_id: 'sample-contractor-2',
          company_id: '987654321',
          name: 'קבלן חשמל מתקדם בע"מ',
          nameEnglish: 'Advanced Electrical Contractor Ltd',
          companyType: 'בע"מ',
          numberOfEmployees: 75,
          foundationDate: '2015-03-20',
          city: 'חיפה',
          address: 'רחוב אלנבי 456, חיפה',
          email: 'info@advanced-electrical.co.il',
          phone: '04-7654321',
          website: 'www.advanced-electrical.co.il',
          sector: 'חשמל',
          segment: 'קבלן משנה',
          activityType: 'חשמל ואלקטרוניקה',
          description: 'חברת חשמל מתמחה בהתקנות חשמל מתקדמות',
          safetyStars: 5,
          iso45001: true,
          activities: [
            { id: '1', activity_type: 'חשמל', classification: 'קבלן משנה' }
          ],
          management_contacts: [
            {
              id: '1',
              fullName: 'שרה לוי',
              role: 'מנהלת פרויקטים',
              email: 'sarah@advanced-electrical.co.il',
              mobile: '050-7654321',
              permissions: 'project_manager'
            }
          ],
          projects: [],
          notes: 'מומחים בחשמל תעשייתי',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          contractor_id: 'sample-contractor-3',
          company_id: '555666777',
          name: 'קבלן אינסטלציה מהיר בע"מ',
          nameEnglish: 'Quick Plumbing Contractor Ltd',
          companyType: 'בע"מ',
          numberOfEmployees: 45,
          foundationDate: '2018-07-10',
          city: 'ירושלים',
          address: 'רחוב יפו 789, ירושלים',
          email: 'info@quick-plumbing.co.il',
          phone: '02-9876543',
          website: 'www.quick-plumbing.co.il',
          sector: 'אינסטלציה',
          segment: 'קבלן משנה',
          activityType: 'אינסטלציה ומים',
          description: 'חברת אינסטלציה המתמחה בעבודות מים וביוב',
          safetyStars: 3,
          iso45001: false,
          activities: [
            { id: '1', activity_type: 'אינסטלציה', classification: 'קבלן משנה' }
          ],
          management_contacts: [
            {
              id: '1',
              fullName: 'משה גולדברג',
              role: 'מנהל טכני',
              email: 'moshe@quick-plumbing.co.il',
              mobile: '050-9876543',
              permissions: 'technical'
            }
          ],
          projects: [],
          notes: 'מהירים ואמינים בעבודות אינסטלציה',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await db.collection('contractors').insertMany(sampleContractors);
      console.log('✅ Created sample contractors data');
    }

    // Create sample projects if collection is empty
    const existingProjects = await db.collection('projects').countDocuments();
    if (existingProjects === 0) {
      // Create sample projects
      const sampleProjects = [
        {
          contractorId: 'sample-contractor-1',
          startDate: '2024-01-15',
          projectName: 'בניית מגדל מגורים',
          description: 'בניית מגדל מגורים בן 15 קומות עם 120 דירות',
          value: 50000000,
          isClosed: false,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          contractorId: 'sample-contractor-1',
          startDate: '2024-06-01',
          projectName: 'פרויקט עתידי',
          description: 'פרויקט שעדיין לא התחיל - בניית מרכז מסחרי',
          value: 30000000,
          isClosed: false,
          status: 'future',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          contractorId: 'sample-contractor-1',
          startDate: '2023-03-15',
          projectName: 'פרויקט שהושלם',
          description: 'בניית בית ספר יסודי - פרויקט שהושלם בהצלחה',
          value: 15000000,
          isClosed: true,
          status: 'closed',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await db.collection('projects').insertMany(sampleProjects);
      console.log('✅ Sample data created successfully');
      console.log('📋 Created', sampleProjects.length, 'sample projects');
    } else {
      console.log('📋 Database already contains', existingProjects, 'projects');
    }
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Contractor CRM API is running',
    database: 'MongoDB Memory Server',
    timestamp: new Date().toISOString()
  });
});

// Contractors API
app.get('/api/contractors', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const contractors = await db.collection('contractors').find({}).toArray();
    console.log('📋 Fetched', contractors.length, 'contractors');
    res.json(contractors);
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
    res.json(contractor);
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
      createdAt: new Date(),
      updatedAt: new Date()
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
    const db = client.db('contractor-crm');
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    const result = await db.collection('contractors').updateOne(
      { contractor_id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    console.log('✅ Updated contractor:', req.params.id);
    res.json(updateData);
  } catch (error) {
    console.error('❌ Error updating contractor:', error);
    res.status(500).json({ error: 'Failed to update contractor' });
  }
});

app.delete('/api/contractors/:id', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const result = await db.collection('contractors').deleteOne({ contractor_id: req.params.id });
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

// Projects API
app.get('/api/projects', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const { contractorId } = req.query;

    let query = {};
    if (contractorId) {
      query.contractorId = contractorId;
    }

    const projects = await db.collection('projects').find(query).toArray();
    console.log('📋 Fetched', projects.length, 'projects for contractor:', contractorId || 'all');
    res.json(projects);
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
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
    const result = await db.collection('projects').insertOne(projectData);
    console.log('✅ Created new project:', result.insertedId);
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
      { _id: req.params.id },
      { $set: updateData }
    );
    console.log('✅ Updated project:', req.params.id);
    res.json(result);
  } catch (error) {
    console.error('❌ Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const db = client.db('contractor-crm');
    const result = await db.collection('projects').deleteOne({ _id: req.params.id });
    console.log('✅ Deleted project:', req.params.id);
    res.json(result);
  } catch (error) {
    console.error('❌ Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  if (client) {
    await client.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  process.exit(0);
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log('🚀 Server running on port', PORT);
    console.log('🏥 Health check: http://localhost:' + PORT + '/api/health');
    console.log('📋 Projects API: http://localhost:' + PORT + '/api/projects');
  });
});
