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

// Parse Garmoshka (building plans) endpoint
router.post('/parse-garmoshka', async (req, res) => {
    try {
        const { fileUrl } = req.body;
        
        if (!fileUrl) {
            return res.status(400).json({
                success: false,
                error: 'File URL is required'
            });
        }

        console.log('🔍 Parsing Garmoshka from URL:', fileUrl);
        
        // Parse the document using our service
        const extractedData = await DocumentParserService.parseGarmoshkaReport(fileUrl);
        
        console.log('✅ Successfully parsed Garmoshka document:', extractedData);
        
        res.json({
            success: true,
            data: extractedData
        });
        
    } catch (error) {
        console.error('❌ Error parsing Garmoshka document:', error);
        
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to parse Garmoshka document'
        });
    }
});

module.exports = router;
