const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireContactAuth } = require('../middleware/contact-auth');
const Contractor = require('../../src/models/Contractor');

// Upload certificate endpoint - support both regular users and contact users
router.post('/upload-certificate', async (req, res) => {
    // Check if user is authenticated (either regular user or contact user)
    const token = req.headers.authorization?.replace('Bearer ', '');
    const contactUser = req.headers['contact-user'];
    const contactSession = req.headers['contact-session'];

    if (!token && !contactUser) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const { contractorId, fileType, fileName, fileSize, mimeType, data, uploadedAt } = req.body;

        if (!contractorId || !fileType || !fileName || !data) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Here you would save to your database
        // For now, we'll just return success
        // In a real implementation, you would:
        // 1. Save the base64 data to MongoDB
        // 2. Update the contractor document with file reference
        // 3. Handle file storage (GridFS for large files, or base64 for small files)

        console.log('File upload request:', {
            contractorId,
            fileType,
            fileName,
            fileSize,
            mimeType,
            uploadedAt
        });

        res.json({
            success: true,
            message: 'File uploaded successfully',
            fileId: `file_${Date.now()}` // Temporary file ID
        });

    } catch (error) {
        console.error('Error uploading certificate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search contractors by company ID endpoint
router.get('/search', async (req, res) => {
    try {
        // Check if user is authenticated (either regular user, contact user, or system admin)
        const token = req.headers.authorization?.replace('Bearer ', '');
        const contactUser = req.headers['contact-user'];
        const contactSession = req.headers['contact-session'];
        const systemAdmin = req.headers['system-admin'];

        if (!token && !contactUser && !systemAdmin) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { companyId } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }

        console.log('🔍 Searching for contractor with companyId:', companyId);

        // Search for contractor by companyId
        const contractors = await Contractor.find({ companyId: companyId });

        console.log('📋 Found contractors:', contractors.length);

        res.json(contractors);

    } catch (error) {
        console.error('❌ Error searching contractors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get certificate endpoint
router.get('/certificate/:contractorId/:fileType', requireAuth, async (req, res) => {
    try {
        const { contractorId, fileType } = req.params;

        // Here you would retrieve the file from your database
        // For now, we'll return a placeholder response

        res.json({
            success: true,
            message: 'Certificate retrieved successfully',
            fileType,
            contractorId
        });

    } catch (error) {
        console.error('Error retrieving certificate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
