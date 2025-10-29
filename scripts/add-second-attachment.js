require('dotenv').config();
const { getDb } = require('../server/lib/mongo');

async function addSecondAttachment() {
    try {
        console.log('🔗 Connecting to database...');
        const db = await getDb();
        const projectId = '68bd7488690387dac0eb69c0';

        // Get the current claim
        console.log('🔍 Getting current claim...');
        const claim = await db.collection('claims').findOne({ projectId });
        if (!claim) {
            console.log('❌ No claim found for project');
            return;
        }

        console.log('📋 Current attachments:', claim.generalAttachments?.length || 0);

        // Create second attachment based on the second report
        // This represents the "דיווח מלא" (full report) mentioned in the Gmail
        const secondAttachment = {
            id: '19a244bdd58f1a8a', // Second Gmail message ID
            documentType: 'דו״ח דיווח תאונה',
            documentDescription: 'קל', // Same severity
            fileUrl: 'https://www.safeguardapps.com/storage/servlet/Image?c=352484338&token=1418704381-450642468-450642453',
            thumbnailUrl: 'https://www.safeguardapps.com/storage/servlet/Image?c=352484338&token=1418704381-450642468-450642453',
            validUntil: '17/10/2025' // Same event date
        };

        // Add the second attachment to the existing ones
        const updatedAttachments = [
            ...(claim.generalAttachments || []),
            secondAttachment
        ];

        console.log('🔧 Adding second attachment:');
        console.log('  - Document Type:', secondAttachment.documentType);
        console.log('  - Document Description:', secondAttachment.documentDescription);
        console.log('  - Valid Until:', secondAttachment.validUntil);
        console.log('  - Gmail Message ID:', secondAttachment.id);

        // Update the claim
        console.log('💾 Updating claim with both attachments...');
        const result = await db.collection('claims').updateOne(
            { _id: claim._id },
            {
                $set: {
                    generalAttachments: updatedAttachments,
                    updatedAt: new Date()
                }
            }
        );

        console.log('✅ Updated claim:', result.modifiedCount, 'documents');

        // Verify the update
        console.log('🔍 Verifying update...');
        const updatedClaim = await db.collection('claims').findOne({ _id: claim._id });
        console.log('📋 Updated attachments count:', updatedClaim.generalAttachments?.length || 0);
        updatedClaim.generalAttachments?.forEach((att, index) => {
            console.log(`  Attachment ${index + 1}:`);
            console.log(`    - ID: ${att.id}`);
            console.log(`    - Type: ${att.documentType}`);
            console.log(`    - Description: ${att.documentDescription}`);
            console.log(`    - Valid Until: ${att.validUntil}`);
        });

        console.log('🎉 Second attachment added successfully!');

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
    } finally {
        process.exit(0);
    }
}

addSecondAttachment();



