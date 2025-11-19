#!/usr/bin/env node

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const sharp = require('sharp');
const { put } = require('@vercel/blob');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';

async function generateMedicalThumbnails() {
    let client;
    
    try {
        console.log('🚀 Starting medical document thumbnail generation...');
        
        // Connect to MongoDB
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db('contractor-crm');
        
        console.log('✅ Connected to MongoDB');
        
        // Find all claims with medical documents
        const claims = await db.collection('claims').find({}).toArray();
        console.log(`📋 Found ${claims.length} claims to process`);
        
        let totalProcessed = 0;
        let totalUpdated = 0;
        
        for (const claim of claims) {
            console.log(`\n🔍 Processing claim: ${claim._id}`);
            
            // Process injured employees medical documents
            if (claim.injuredEmployees && Array.isArray(claim.injuredEmployees)) {
                for (let i = 0; i < claim.injuredEmployees.length; i++) {
                    const employee = claim.injuredEmployees[i];
                    if (employee.medicalTreatment && employee.medicalTreatment.medicalDocuments) {
                        const updated = await processMedicalDocuments(
                            db, 
                            claim._id, 
                            `injuredEmployees.${i}.medicalTreatment.medicalDocuments`,
                            employee.medicalTreatment.medicalDocuments
                        );
                        totalUpdated += updated;
                    }
                }
            }
            
            // Process third party victims medical documents
            if (claim.thirdPartyVictims && Array.isArray(claim.thirdPartyVictims)) {
                for (let i = 0; i < claim.thirdPartyVictims.length; i++) {
                    const victim = claim.thirdPartyVictims[i];
                    if (victim.medicalTreatment && victim.medicalTreatment.medicalDocuments) {
                        const updated = await processMedicalDocuments(
                            db, 
                            claim._id, 
                            `thirdPartyVictims.${i}.medicalTreatment.medicalDocuments`,
                            victim.medicalTreatment.medicalDocuments
                        );
                        totalUpdated += updated;
                    }
                }
            }
            
            totalProcessed++;
        }
        
        console.log(`\n✅ Processing complete!`);
        console.log(`📊 Claims processed: ${totalProcessed}`);
        console.log(`🖼️ Thumbnails generated: ${totalUpdated}`);
        
    } catch (error) {
        console.error('❌ Error generating medical thumbnails:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB connection closed');
        }
    }
}

async function processMedicalDocuments(db, claimId, path, medicalDocuments) {
    let updated = 0;
    
    for (let i = 0; i < medicalDocuments.length; i++) {
        const doc = medicalDocuments[i];
        
        // Skip if already has thumbnail
        if (doc.thumbnailUrl) {
            console.log(`  ⏭️ Document ${i} already has thumbnail: ${doc.documentName}`);
            continue;
        }
        
        // Skip if no file URL
        if (!doc.fileUrl) {
            console.log(`  ⚠️ Document ${i} has no file URL: ${doc.documentName}`);
            continue;
        }
        
        console.log(`  🖼️ Generating thumbnail for: ${doc.documentName}`);
        
        try {
            const thumbnailUrl = await generateThumbnailFromUrl(doc.fileUrl);
            
            if (thumbnailUrl) {
                // Update the document in the database
                const updatePath = `${path}.${i}.thumbnailUrl`;
                await db.collection('claims').updateOne(
                    { _id: claimId },
                    { $set: { [updatePath]: thumbnailUrl } }
                );
                
                console.log(`  ✅ Thumbnail generated: ${thumbnailUrl}`);
                updated++;
            } else {
                console.log(`  ❌ Failed to generate thumbnail for: ${doc.documentName}`);
            }
            
        } catch (error) {
            console.error(`  ❌ Error processing document ${doc.documentName}:`, error.message);
        }
    }
    
    return updated;
}

async function generateThumbnailFromUrl(fileUrl) {
    try {
        // Fetch the file
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status}`);
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || '';
        
        // Generate thumbnail based on file type
        let thumbnailBuffer;
        
        if (contentType === 'application/pdf') {
            // Use existing PDF thumbnail generation
            const { pdfFirstPageToPngBuffer } = require('../server/lib/pdfThumbnail');
            thumbnailBuffer = await pdfFirstPageToPngBuffer(buffer, 200);
        } else if (contentType.startsWith('image/')) {
            // Use Sharp for image thumbnails
            thumbnailBuffer = await sharp(buffer)
                .resize(200, null, { 
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .png()
                .toBuffer();
        } else {
            console.log(`  ⚠️ Unsupported file type: ${contentType}`);
            return null;
        }
        
        // Upload thumbnail to Vercel Blob
        const blobKey = `thumbnails/medical-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
        const blob = await put(blobKey, thumbnailBuffer, {
            access: 'public',
            contentType: 'image/png'
        });
        
        return blob.url;
        
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        return null;
    }
}

// Run the script
if (require.main === module) {
    generateMedicalThumbnails()
        .then(() => {
            console.log('🎉 Script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Script failed:', error);
            process.exit(1);
        });
}

module.exports = { generateMedicalThumbnails };






















