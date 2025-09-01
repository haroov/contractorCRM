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

    // Create unique index on company_id to prevent duplicates
    const db = client.db('contractor-crm');
    await db.collection('contractors').createIndex({ company_id: 1 }, { unique: true, sparse: true });
    console.log('✅ Created unique index on company_id');

    // No automatic sample data creation - contractors must be added manually
    console.log('📝 No automatic sample data creation - contractors must be added manually');

  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

// Sample data creation removed - contractors must be added manually through the interface

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

    // Remove immutable fields from update data
    const { _id, createdAt, ...updateData } = req.body;

    const finalUpdateData = {
      ...updateData,
      updatedAt: new Date()
    };

    const result = await db.collection('contractors').updateOne(
      { contractor_id: req.params.id },
      { $set: finalUpdateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    console.log('✅ Updated contractor:', req.params.id);

    // Return the updated contractor data
    const updatedContractor = await db.collection('contractors').findOne({ contractor_id: req.params.id });
    res.json(updatedContractor);
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
