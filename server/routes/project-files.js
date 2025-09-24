const express = require('express');
const multer = require('multer');
const { put, del } = require('@vercel/blob');
const { MongoClient, ObjectId } = require('mongodb');
// const { generateThumbnail } = require('../lib/pdfThumb'); // Replaced with new PDF thumbnail API
const fs = require('fs');
const path = require('path');
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
router.post('/upload-project-file', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('❌ Multer error:', err);
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }
        next();
    });
}, async (req, res) => {
    try {
        console.log('🚀 Upload endpoint hit');
        await initDB();

        const { projectId } = req.body;
        const file = req.file;

        console.log('📁 Project ID:', projectId);
        console.log('📁 File received:', file ? {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        } : 'No file');

        if (!file) {
            console.log('❌ No file uploaded');
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

        let thumbnailUrl = null;

        // Generate thumbnail for PDF files using new API
        if (file.mimetype === 'application/pdf') {
            console.log('📄 PDF file detected, generating thumbnail using new API...');
            try {
                // Call the new PDF thumbnail API using form-data package
                const FormData = require('form-data');
                const formData = new FormData();
                formData.append('pdf', file.buffer, {
                    filename: file.originalname,
                    contentType: file.mimetype
                });
                formData.append('key', `project-${projectId || 'temp'}-${Date.now()}`);
                formData.append('targetWidth', '200');

                const thumbnailResponse = await fetch(`${req.protocol}://${req.get('host')}/api/pdf-thumbnail`, {
                    method: 'POST',
                    headers: formData.getHeaders(),
                    body: formData
                });

                if (thumbnailResponse.ok) {
                    const thumbnailData = await thumbnailResponse.json();
                    thumbnailUrl = thumbnailData.url;
                    console.log('✅ Thumbnail generated and uploaded:', thumbnailUrl);
                } else {
                    console.error('❌ Thumbnail API failed:', thumbnailResponse.status, await thumbnailResponse.text());
                }
            } catch (thumbnailError) {
                console.error('❌ Error generating thumbnail:', thumbnailError);
                // Continue without thumbnail - don't fail the upload
            }
        } else {
            console.log('📄 File is not PDF, skipping thumbnail generation');
        }

        const response = {
            success: true,
            message: 'File uploaded successfully',
            data: {
                url: blob.url,
                thumbnailUrl: thumbnailUrl,
                filename: filename,
                originalName: file.originalname,
                size: file.size,
                mimeType: file.mimetype
            }
        };

        console.log('✅ Upload successful, sending response:', response);
        res.json(response);

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
