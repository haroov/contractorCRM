const express = require('express');
const multer = require('multer');
const { put } = require('@vercel/blob');
const { MongoClient, ObjectId } = require('mongodb');
const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, JPG, PNG files
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
    }
  }
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';
let client;
let db;

// Initialize MongoDB connection
async function initDB() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('contractor-crm');
  }
}

// Upload certificate endpoint
router.post('/certificate', upload.single('file'), async (req, res) => {
  try {
    console.log('📁 Upload certificate endpoint called');
    console.log('🔑 BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);
    console.log('📋 Request body:', req.body);
    console.log('📁 File info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');
    
    await initDB();
    
    const { contractorId, certificateType } = req.body;
    const file = req.file;
    
    if (!contractorId || !certificateType || !file) {
      console.log('❌ Missing required fields:', { contractorId, certificateType, hasFile: !!file });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: contractorId, certificateType, or file' 
      });
    }

    // Validate contractor exists
    const contractor = await db.collection('contractors').findOne({
      _id: new ObjectId(contractorId)
    });

    if (!contractor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contractor not found' 
      });
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.originalname.split('.').pop();
    const filename = `${contractorId}/${certificateType}_${timestamp}.${fileExtension}`;

    console.log(`📁 Uploading certificate: ${filename}`);

    // Upload to Vercel Blob
    let blob;
    try {
      console.log('🔄 Attempting to upload to Vercel Blob...');
      blob = await put(filename, file.buffer, {
        access: 'public',
        contentType: file.mimetype,
      });
      console.log(`✅ Certificate uploaded successfully: ${blob.url}`);
    } catch (blobError) {
      console.error('❌ Vercel Blob upload error:', blobError);
      throw blobError;
    }

    // Update contractor document with certificate URL
    const updateField = `${certificateType}Certificate`;
    await db.collection('contractors').updateOne(
      { _id: new ObjectId(contractorId) },
      { 
        $set: { 
          [updateField]: blob.url,
          [`${certificateType}LastUpdated`]: new Date().toISOString()
        } 
      }
    );

    console.log(`✅ Updated contractor ${contractorId} with ${certificateType} certificate URL`);

    res.json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: {
        url: blob.url,
        filename: filename,
        certificateType: certificateType,
        contractorId: contractorId
      }
    });

  } catch (error) {
    console.error('❌ Error uploading certificate:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload certificate',
      details: error.message 
    });
  }
});

// Delete certificate endpoint
router.delete('/certificate', async (req, res) => {
  try {
    await initDB();
    
    const { contractorId, certificateType } = req.body;
    
    if (!contractorId || !certificateType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: contractorId or certificateType' 
      });
    }

    // Update contractor document to remove certificate URL
    const updateField = `${certificateType}Certificate`;
    await db.collection('contractors').updateOne(
      { _id: new ObjectId(contractorId) },
      { 
        $unset: { 
          [updateField]: "",
          [`${certificateType}LastUpdated`]: ""
        } 
      }
    );

    console.log(`✅ Removed ${certificateType} certificate from contractor ${contractorId}`);

    res.json({
      success: true,
      message: 'Certificate removed successfully',
      data: {
        certificateType: certificateType,
        contractorId: contractorId
      }
    });

  } catch (error) {
    console.error('❌ Error removing certificate:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove certificate',
      details: error.message 
    });
  }
});

// Get certificate info endpoint
router.get('/certificate/:contractorId/:certificateType', async (req, res) => {
  try {
    await initDB();
    
    const { contractorId, certificateType } = req.params;
    
    const contractor = await db.collection('contractors').findOne({
      _id: new ObjectId(contractorId)
    });

    if (!contractor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contractor not found' 
      });
    }

    const certificateField = `${certificateType}Certificate`;
    const lastUpdatedField = `${certificateType}LastUpdated`;
    
    const certificateUrl = contractor[certificateField];
    const lastUpdated = contractor[lastUpdatedField];

    res.json({
      success: true,
      data: {
        contractorId: contractorId,
        certificateType: certificateType,
        url: certificateUrl || null,
        lastUpdated: lastUpdated || null,
        hasCertificate: !!certificateUrl
      }
    });

  } catch (error) {
    console.error('❌ Error getting certificate info:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get certificate info',
      details: error.message 
    });
  }
});

module.exports = router;
