const express = require('express');
const multer = require('multer');
const { put, del } = require('@vercel/blob');
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

// Upload project file endpoint
router.post('/upload-project-file', upload.single('file'), async (req, res) => {
    try {
        await initDB();

        const { projectId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileExtension = file.originalname.split('.').pop();
        const filename = `projects/${projectId || 'temp'}/${timestamp}.${fileExtension}`;

        // Upload to Vercel Blob
        const blob = await put(filename, file.buffer, {
            access: 'public',
            contentType: file.mimetype,
        });

        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url: blob.url,
                filename: filename,
                originalName: file.originalname,
                size: file.size,
                mimeType: file.mimetype
            }
        });

    } catch (error) {
        console.error('❌ Error uploading project file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload file',
            details: error.message
        });
    }
});

// Delete project file endpoint
router.delete('/delete-project-file', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'File URL is required'
            });
        }

        // Delete from Vercel Blob
        await del(url);

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting project file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete file',
            details: error.message
        });
    }
});

module.exports = router;
