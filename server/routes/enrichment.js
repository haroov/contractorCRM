const express = require('express');
const { getDb } = require('../lib/mongo');
const router = express.Router();

// Get banks from MongoDB Atlas enrichment collection
router.get('/banks', async (req, res) => {
    try {
        console.log('🔄 Fetching banks from enrichment collection');
        const db = await getDb();
        const banksCollection = db.collection('banks');
        
        const banks = await banksCollection.find({}).toArray();
        console.log(`🔄 Found ${banks.length} banks`);
        
        res.json(banks);
    } catch (error) {
        console.error('Error fetching banks:', error);
        res.status(500).json({ error: 'Failed to fetch banks' });
    }
});

module.exports = router;
