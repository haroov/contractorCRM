const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/mongo');

// Route to create a new claim
router.post('/', async (req, res) => {
    try {
        const db = await getDb();
        const claimsCollection = db.collection('claims');
        
        const claimData = {
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await claimsCollection.insertOne(claimData);
        
        res.status(201).json({
            success: true,
            message: 'Claim created successfully',
            claimId: result.insertedId
        });
    } catch (error) {
        console.error('Error creating claim:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create claim', 
            error: error.message 
        });
    }
});

// Route to get all claims for a project
router.get('/project/:projectId', async (req, res) => {
    try {
        const db = await getDb();
        const claimsCollection = db.collection('claims');
        
        const { projectId } = req.params;
        const claims = await claimsCollection.find({ projectId }).toArray();
        
        res.json({
            success: true,
            claims: claims
        });
    } catch (error) {
        console.error('Error fetching claims:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch claims', 
            error: error.message 
        });
    }
});

// Route to get a specific claim by ID
router.get('/:claimId', async (req, res) => {
    try {
        const db = await getDb();
        const claimsCollection = db.collection('claims');
        const { ObjectId } = require('mongodb');
        
        const { claimId } = req.params;
        const claim = await claimsCollection.findOne({ _id: new ObjectId(claimId) });
        
        if (!claim) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }
        
        res.json({
            success: true,
            claim: claim
        });
    } catch (error) {
        console.error('Error fetching claim:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch claim', 
            error: error.message 
        });
    }
});

// Route to update a claim
router.put('/:claimId', async (req, res) => {
    try {
        const db = await getDb();
        const claimsCollection = db.collection('claims');
        const { ObjectId } = require('mongodb');
        
        const { claimId } = req.params;
        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };
        
        const result = await claimsCollection.updateOne(
            { _id: new ObjectId(claimId) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Claim updated successfully'
        });
    } catch (error) {
        console.error('Error updating claim:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update claim', 
            error: error.message 
        });
    }
});

// Route to delete a claim
router.delete('/:claimId', async (req, res) => {
    try {
        const db = await getDb();
        const claimsCollection = db.collection('claims');
        const { ObjectId } = require('mongodb');
        
        const { claimId } = req.params;
        const result = await claimsCollection.deleteOne({ _id: new ObjectId(claimId) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Claim deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting claim:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete claim', 
            error: error.message 
        });
    }
});

module.exports = router;
