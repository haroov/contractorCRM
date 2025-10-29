require('dotenv').config();
const { getDb } = require('../server/lib/mongo');

async function updateAttachmentDetails() {
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

        // Update the attachment with correct details
        const updatedAttachments = claim.generalAttachments?.map(attachment => {
            if (attachment.documentType === 'safeguard-incident') {
                return {
                    ...attachment,
                    documentType: 'דו״ח דיווח תאונה',
                    documentDescription: 'קל', // Based on the accident severity
                    validUntil: '17/10/2025', // Event date
                    thumbnailUrl: 'https://www.safeguardapps.com/storage/servlet/Image?c=352484338&token=1418704381-450642468-450642453' // Same as fileUrl for now
                };
            }
            return attachment;
        }) || [];

        console.log('🔧 Updated attachment details:');
        console.log('  - Document Type:', updatedAttachments[0]?.documentType);
        console.log('  - Document Description:', updatedAttachments[0]?.documentDescription);
        console.log('  - Valid Until:', updatedAttachments[0]?.validUntil);
        console.log('  - Thumbnail URL:', updatedAttachments[0]?.thumbnailUrl);

        // Update the claim
        console.log('💾 Updating claim with updated attachments...');
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
        console.log('📋 Updated attachments:');
        updatedClaim.generalAttachments?.forEach((att, index) => {
            console.log(`  Attachment ${index + 1}:`);
            console.log(`    - Type: ${att.documentType}`);
            console.log(`    - Description: ${att.documentDescription}`);
            console.log(`    - Valid Until: ${att.validUntil}`);
            console.log(`    - Thumbnail: ${att.thumbnailUrl}`);
        });

        console.log('🎉 Attachment details updated successfully!');

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
    } finally {
        process.exit(0);
    }
}

updateAttachmentDetails();



