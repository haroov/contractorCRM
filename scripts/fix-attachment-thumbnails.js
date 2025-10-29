require('dotenv').config();
const { getDb } = require('../server/lib/mongo');

async function fixAttachmentThumbnails() {
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

        // Update attachments with proper thumbnails and email dates
        const updatedAttachments = claim.generalAttachments?.map((attachment, index) => {
            console.log(`Processing attachment ${index + 1}: ${attachment.id}`);

            // Use the PDF report link as thumbnail (it will show the PDF preview)
            const thumbnailUrl = `https://www.safeguardapps.com/storage/servlet/Image?c=352484338&token=1418704381-450642468-450642453`;

            // Set email receipt date based on Gmail message ID
            // First email: 19a24606e95d5c04 -> received on 28/10/2025
            // Second email: 19a244bdd58f1a8a -> received on 27/10/2025 (as per email date)
            let emailDate = '28/10/2025'; // Default to first email date
            if (attachment.id === '19a244bdd58f1a8a') {
                emailDate = '27/10/2025'; // Second email was received on 27/10
            }

            return {
                ...attachment,
                thumbnailUrl: thumbnailUrl,
                validUntil: emailDate
            };
        }) || [];

        console.log('🔧 Updated attachment details:');
        updatedAttachments.forEach((att, index) => {
            console.log(`  Attachment ${index + 1}:`);
            console.log(`    - ID: ${att.id}`);
            console.log(`    - Thumbnail: ${att.thumbnailUrl}`);
            console.log(`    - Valid Until: ${att.validUntil}`);
        });

        // Update the claim
        console.log('💾 Updating claim with fixed attachments...');
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

        console.log('🎉 Attachments updated with thumbnails and email dates!');

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
    } finally {
        process.exit(0);
    }
}

fixAttachmentThumbnails();



