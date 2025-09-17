const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateThumbnail, checkPopplerAvailable } = require('../../src/lib/pdfThumb.js');
const { authenticateToken } = require('../middleware/auth.js');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/temp/',
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Check if Poppler is available
router.get('/check-poppler', authenticateToken, async (req, res) => {
    try {
        const isAvailable = await checkPopplerAvailable();
        res.json({
            available: isAvailable,
            message: isAvailable ? 'Poppler is available' : 'Poppler is not installed'
        });
    } catch (error) {
        console.error('Error checking Poppler:', error);
        res.status(500).json({
            available: false,
            error: 'Failed to check Poppler availability'
        });
    }
});

// Generate thumbnail from uploaded PDF
router.post('/generate', authenticateToken, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        // Check if Poppler is available
        const popplerAvailable = await checkPopplerAvailable();
        if (!popplerAvailable) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(500).json({
                error: 'Poppler is not installed. Please install Poppler to generate PDF thumbnails.',
                installInstructions: {
                    macOS: 'brew install poppler',
                    ubuntu: 'sudo apt-get update && sudo apt-get install -y poppler-utils',
                    windows: 'choco install poppler'
                }
            });
        }

        const { page = 1, width = 800, format = 'png' } = req.body;

        // Generate thumbnail
        const result = await generateThumbnail({
            pdfPath: req.file.path,
            page: parseInt(page),
            width: parseInt(width),
            format: format,
            outDir: 'uploads/thumbnails/',
            overwrite: true
        });

        // Clean up temporary uploaded file
        fs.unlinkSync(req.file.path);

        // Return the thumbnail path (relative to public directory)
        const thumbnailUrl = `/uploads/thumbnails/${path.basename(result.outPath)}`;

        res.json({
            success: true,
            thumbnailUrl,
            thumbnailPath: result.outPath,
            width: result.width,
            height: result.height,
            page: result.page,
            format: result.format
        });

    } catch (error) {
        console.error('Error generating PDF thumbnail:', error);

        // Clean up uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'Failed to generate PDF thumbnail',
            details: error.message
        });
    }
});

// Generate thumbnail from existing PDF URL
router.post('/generate-from-url', authenticateToken, async (req, res) => {
    try {
        const { pdfUrl, page = 1, width = 800, format = 'png' } = req.body;

        if (!pdfUrl) {
            return res.status(400).json({ error: 'PDF URL is required' });
        }

        // Check if Poppler is available
        const popplerAvailable = await checkPopplerAvailable();
        if (!popplerAvailable) {
            return res.status(500).json({
                error: 'Poppler is not installed. Please install Poppler to generate PDF thumbnails.',
                installInstructions: {
                    macOS: 'brew install poppler',
                    ubuntu: 'sudo apt-get update && sudo apt-get install -y poppler-utils',
                    windows: 'choco install poppler'
                }
            });
        }

        // Download the PDF file temporarily
        const response = await fetch(pdfUrl);
        if (!response.ok) {
            throw new Error(`Failed to download PDF: ${response.statusText}`);
        }

        const pdfBuffer = await response.arrayBuffer();
        const tempPdfPath = `uploads/temp/temp-${Date.now()}.pdf`;

        // Ensure temp directory exists
        fs.mkdirSync('uploads/temp/', { recursive: true });
        fs.writeFileSync(tempPdfPath, Buffer.from(pdfBuffer));

        // Generate thumbnail
        const result = await generateThumbnail({
            pdfPath: tempPdfPath,
            page: parseInt(page),
            width: parseInt(width),
            format: format,
            outDir: 'uploads/thumbnails/',
            overwrite: true
        });

        // Clean up temporary PDF file
        fs.unlinkSync(tempPdfPath);

        // Return the thumbnail path (relative to public directory)
        const thumbnailUrl = `/uploads/thumbnails/${path.basename(result.outPath)}`;

        res.json({
            success: true,
            thumbnailUrl,
            thumbnailPath: result.outPath,
            width: result.width,
            height: result.height,
            page: result.page,
            format: result.format
        });

    } catch (error) {
        console.error('Error generating PDF thumbnail from URL:', error);
        res.status(500).json({
            error: 'Failed to generate PDF thumbnail from URL',
            details: error.message
        });
    }
});

module.exports = router;
