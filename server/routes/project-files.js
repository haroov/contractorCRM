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

        // Generate thumbnail for PDF files directly
        if (file.mimetype === 'application/pdf') {
            console.log('📄 PDF file detected, generating thumbnail directly...');
            try {
                const { pdfFirstPageToPngBuffer } = require('../lib/pdfThumbnail');
                const { savePngToVercelBlob } = require('../lib/saveToVercelBlob');

                console.log('🖼️ Creating PDF thumbnail with targetWidth: 200');
                const png = await pdfFirstPageToPngBuffer(file.buffer, 200);

                const blobKey = `thumbnails/project-${projectId || 'temp'}-${Date.now()}.png`;
                console.log('💾 Saving thumbnail to Vercel Blob with key:', blobKey);

                thumbnailUrl = await savePngToVercelBlob(blobKey, png, true);
                console.log('✅ Thumbnail generated and uploaded:', thumbnailUrl);

            } catch (thumbnailError) {
                console.error('❌ Error generating thumbnail:', thumbnailError);
                console.error('❌ Thumbnail error stack:', thumbnailError.stack);
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
        console.log('🗑️ Delete request received:', req.body);
        const { fileUrl, thumbnailUrl } = req.body;

        if (!fileUrl && !thumbnailUrl) {
            console.log('❌ No file URLs provided');
            return res.status(400).json({
                success: false,
                error: 'At least one file URL is required'
            });
        }

        console.log('🗑️ File URLs to delete:', { fileUrl, thumbnailUrl });
        const deletedFiles = [];
        const errors = [];

        // Delete main file from Vercel Blob
        if (fileUrl) {
            try {
                console.log('🗑️ Attempting to delete main file:', fileUrl);
                await del(fileUrl);
                deletedFiles.push('main file');
                console.log('✅ Successfully deleted main file:', fileUrl);
            } catch (error) {
                console.error('❌ Error deleting main file:', error);
                console.error('❌ Error details:', error.message, error.stack);
                errors.push(`Main file: ${error.message}`);
            }
        }

        // Delete thumbnail from Vercel Blob
        if (thumbnailUrl) {
            try {
                console.log('🗑️ Attempting to delete thumbnail:', thumbnailUrl);
                await del(thumbnailUrl);
                deletedFiles.push('thumbnail');
                console.log('✅ Successfully deleted thumbnail:', thumbnailUrl);
            } catch (error) {
                console.error('❌ Error deleting thumbnail:', error);
                console.error('❌ Error details:', error.message, error.stack);
                errors.push(`Thumbnail: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.log('❌ Some files could not be deleted:', errors);
            return res.status(500).json({
                success: false,
                error: 'Some files could not be deleted',
                details: errors,
                deletedFiles: deletedFiles
            });
        }

        console.log('✅ All files deleted successfully:', deletedFiles);
        res.json({
            success: true,
            message: `Files deleted successfully: ${deletedFiles.join(', ')}`,
            deletedFiles: deletedFiles
        });

    } catch (error) {
        console.error('❌ Unexpected error in delete endpoint:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to delete files',
            details: error.message
        });
    }
});

module.exports = router;
