const express = require('express');
const { getDb } = require('../lib/mongo');
const fetch = require('node-fetch');
const router = express.Router();

// Simple in-memory cache to reduce calls to data.gov.il
let cachedBanks = null;
let cachedAt = 0;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Normalize and transform record from data.gov.il to our expected shape
function transformBankRecord(rec) {
    const bank_name = (rec.Bank_Name || '').toString().trim();
    const branch_number = (rec.Branch_Code != null ? String(rec.Branch_Code) : '').trim();
    const addressParts = [rec.Branch_Address, rec.City].filter(Boolean).map(x => x.toString().trim());
    const address = addressParts.join(', ');
    return { bank_name, branch_number, address };
}

// Test endpoint to verify server is working
router.get('/test', (req, res) => {
    res.json({ message: 'Enrichment route is working', timestamp: new Date().toISOString() });
});

// Get banks from data.gov.il (preferred) with fallback to Mongo collection if needed
router.get('/banks', async (req, res) => {
    try {
        const forceSource = (req.query.source || '').toString();

        // Prefer cached API response unless explicitly bypassed
        if (forceSource !== 'db' && cachedBanks && Date.now() - cachedAt < ONE_DAY_MS) {
            return res.json(cachedBanks);
        }

        if (forceSource !== 'db') {
            try {
                console.log('🔄 Fetching banks from data.gov.il API');
                const url = 'https://data.gov.il/api/3/action/datastore_search?resource_id=1c5bc716-8210-4ec7-85be-92e6271955c2&limit=32000';
                console.log('🔄 Fetch URL:', url);
                const response = await fetch(url, { timeout: 20000 });
                console.log('🔄 Response status:', response.status);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const json = await response.json();
                console.log('🔄 Response keys:', Object.keys(json));
                const records = (json && json.result && Array.isArray(json.result.records)) ? json.result.records : [];
                console.log('🔄 Records count:', records.length);

                const banks = records.map(transformBankRecord).filter(b => b.bank_name && b.branch_number);
                console.log('🔄 Transformed banks count:', banks.length);
                // Cache and return
                cachedBanks = banks;
                cachedAt = Date.now();
                return res.json(banks);
            } catch (apiErr) {
                console.warn('⚠️ data.gov.il API failed, falling back to DB:', apiErr.message || apiErr);
            }
        }

        // Fallback: MongoDB enrichment collection if available
        console.log('🔄 Fetching banks from enrichment collection (fallback)');
        const db = await getDb();
        const banksCollection = db.collection('banks');
        const banksFromDb = await banksCollection.find({}).toArray();
        return res.json(banksFromDb);
    } catch (error) {
        console.error('Error fetching banks:', error);
        res.status(500).json({ error: 'Failed to fetch banks' });
    }
});

module.exports = router;
