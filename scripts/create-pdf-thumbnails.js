require('dotenv').config();
const { getDb } = require('../server/lib/mongo');

async function createPdfThumbnails() {
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

        // Create a simple PDF thumbnail URL (using a generic PDF icon)
        // In a real implementation, you would generate actual thumbnails from the PDF
        const pdfThumbnailUrl = 'data:image/svg+xml;base64,' + Buffer.from(`
      <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
        <rect width="56" height="56" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="1" rx="4"/>
        <rect x="12" y="12" width="32" height="32" fill="#d32f2f" rx="2"/>
        <path d="M20 20h8v2h-8v-2zm0 4h12v2H20v-2zm0 4h10v2H20v-2zm0 4h8v2h-8v-2z" fill="white"/>
        <text x="28" y="50" text-anchor="middle" font-family="Arial" font-size="8" fill="#666">PDF</text>
      </svg>
    `).toString('base64');

        // Update attachments with proper thumbnails
        const updatedAttachments = claim.generalAttachments?.map((attachment) => {
            return {
                ...attachment,
                thumbnailUrl: pdfThumbnailUrl // Use the generated PDF thumbnail
            };
        }) || [];

        console.log('🔧 Updated attachment thumbnails:');
        updatedAttachments.forEach((att, index) => {
            console.log(`  Attachment ${index + 1}:`);
            console.log(`    - ID: ${att.id}`);
            console.log(`    - Thumbnail: ${att.thumbnailUrl.substring(0, 50)}...`);
        });

        // Update the claim
        console.log('💾 Updating claim with PDF thumbnails...');
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

        console.log('🎉 PDF thumbnails created successfully!');

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
    } finally {
        process.exit(0);
    }
}

createPdfThumbnails();



