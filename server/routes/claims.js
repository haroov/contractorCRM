const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/mongo');

// Route to create a new claim
router.post('/', async (req, res) => {
    try {
        console.log('🔍 Received claim data:', req.body);
        const db = await getDb();
        const claimsCollection = db.collection('claims');
        const projectsCollection = db.collection('projects');
        const { ObjectId } = require('mongodb');
        
        const claimData = {
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('🔍 Processed claim data:', claimData);
        
        const result = await claimsCollection.insertOne(claimData);
        
        // Add claim ID to project's claimsId array
        if (req.body.projectId) {
            try {
                // First, get the current project to check if claimsId exists
                const project = await projectsCollection.findOne({ _id: new ObjectId(req.body.projectId) });
                
                if (project) {
                    // If claimsId doesn't exist or is not an array, initialize it
                    let claimsIdArray = [];
                    if (project.claimsId) {
                        if (Array.isArray(project.claimsId)) {
                            claimsIdArray = project.claimsId;
                        } else if (typeof project.claimsId === 'string' && project.claimsId.trim() !== '') {
                            // Convert string to array if it's not empty
                            claimsIdArray = [project.claimsId];
                        }
                    }
                    
                    // Add the new claim ID if it's not already in the array
                    const claimIdString = result.insertedId.toString();
                    if (!claimsIdArray.includes(claimIdString)) {
                        claimsIdArray.push(claimIdString);
                    }
                    
                    // Update the project with the claimsId array
                    await projectsCollection.updateOne(
                        { _id: new ObjectId(req.body.projectId) },
                        { $set: { claimsId: claimsIdArray } }
                    );
                    console.log('✅ Added claim ID to project:', req.body.projectId, 'Claims array:', claimsIdArray);
                }
            } catch (projectError) {
                console.error('❌ Error updating project with claim ID:', projectError);
                // Don't fail the main request if project update fails
            }
        }
        
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
        console.log('🔍 Updating claim:', req.params.claimId);
        console.log('🔍 Received update data:', req.body);
        const db = await getDb();
        const claimsCollection = db.collection('claims');
        const { ObjectId } = require('mongodb');
        
        const { claimId } = req.params;
        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };
        
        console.log('🔍 Processed update data:', updateData);
        
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
        const projectsCollection = db.collection('projects');
        const { ObjectId } = require('mongodb');
        
        const { claimId } = req.params;
        
        // First, get the claim to find its projectId
        const claim = await claimsCollection.findOne({ _id: new ObjectId(claimId) });
        if (!claim) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }
        
        // Delete the claim
        const result = await claimsCollection.deleteOne({ _id: new ObjectId(claimId) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }
        
        // Remove claim ID from project's claimsId array
        if (claim.projectId) {
            try {
                const project = await projectsCollection.findOne({ _id: new ObjectId(claim.projectId) });
                if (project && project.claimsId) {
                    let claimsIdArray = [];
                    if (Array.isArray(project.claimsId)) {
                        claimsIdArray = project.claimsId;
                    } else if (typeof project.claimsId === 'string' && project.claimsId.trim() !== '') {
                        claimsIdArray = [project.claimsId];
                    }
                    
                    // Remove the deleted claim ID
                    const updatedClaimsId = claimsIdArray.filter((id) => id !== claimId);
                    
                    // Update the project
                    await projectsCollection.updateOne(
                        { _id: new ObjectId(claim.projectId) },
                        { $set: { claimsId: updatedClaimsId } }
                    );
                    console.log('✅ Removed claim ID from project:', claim.projectId, 'Updated claims array:', updatedClaimsId);
                }
            } catch (projectError) {
                console.error('❌ Error updating project after claim deletion:', projectError);
                // Don't fail the main request if project update fails
            }
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
