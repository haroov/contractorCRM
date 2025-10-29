require('dotenv').config();
const { getDb } = require('../server/lib/mongo');

async function fixBothDatesTo27() {
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

        // Update both attachments to have the same date (27/10/2025)
        const updatedAttachments = claim.generalAttachments?.map((attachment) => {
            return {
                ...attachment,
                validUntil: '2025-10-27' // Both emails received on 27/10
            };
        }) || [];

        console.log('🔧 Updated both attachments to 27/10/2025:');
        updatedAttachments.forEach((att, index) => {
            console.log(`  Attachment ${index + 1}:`);
            console.log(`    - ID: ${att.id}`);
            console.log(`    - Valid Until: ${att.validUntil}`);
        });

        // Update the claim
        console.log('💾 Updating claim with corrected dates...');
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

        console.log('🎉 Both attachments now have correct date: 27/10/2025!');

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
    } finally {
        process.exit(0);
    }
}

fixBothDatesTo27();



