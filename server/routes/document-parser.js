const express = require('express');
const { DocumentParserService } = require('../services/documentParserService');
const router = express.Router();

// Parse document endpoint
router.post('/parse-soil-report', async (req, res) => {
    try {
        const { fileUrl } = req.body;
        
        if (!fileUrl) {
            return res.status(400).json({
                success: false,
                error: 'File URL is required'
            });
        }

        console.log('🔍 Parsing soil report from URL:', fileUrl);
        
        // Parse the document using our service
        const extractedData = await DocumentParserService.parseSoilReport(fileUrl);
        
        console.log('✅ Successfully parsed document:', extractedData);
        
        res.json({
            success: true,
            data: extractedData
        });
        
    } catch (error) {
        console.error('❌ Error parsing document:', error);
        
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to parse document'
        });
    }
});

module.exports = router;
