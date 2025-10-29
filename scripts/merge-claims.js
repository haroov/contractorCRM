require('dotenv').config();
const { getDb } = require('../server/lib/mongo');
const { ObjectId } = require('mongodb');

async function mergeClaims() {
    try {
        console.log('🔗 Connecting to database...');
        const db = await getDb();
        const projectId = '68bd7488690387dac0eb69c0';

        // Get the two claims
        console.log('🔍 Getting claims for project...');
        const claims = await db.collection('claims').find({ projectId }).toArray();
        console.log('📋 Found', claims.length, 'claims to merge');

        if (claims.length !== 2) {
            console.log('⚠️ Expected 2 claims, found', claims.length);
            return;
        }

        // Sort by updatedAt to keep the newer one
        claims.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        const keep = claims[0];
        const drop = claims[1];

        console.log('✅ Keeping claim:', keep._id, 'Updated:', keep.updatedAt);
        console.log('🗑️ Dropping claim:', drop._id, 'Updated:', drop.updatedAt);

        // Merge attachments
        console.log('🔧 Merging attachments...');
        const keepAtt = Array.isArray(keep.generalAttachments) ? keep.generalAttachments : [];
        const dropAtt = Array.isArray(drop.generalAttachments) ? drop.generalAttachments : [];
        const urlSet = new Set(keepAtt.map(x => x.fileUrl));

        let mergedCount = 0;
        for (const att of dropAtt) {
            if (att.fileUrl && !urlSet.has(att.fileUrl)) {
                keepAtt.push(att);
                urlSet.add(att.fileUrl);
                mergedCount++;
            }
        }

        console.log('📎 Merged', mergedCount, 'new attachments');

        // Update the kept claim with merged attachments
        console.log('💾 Updating kept claim...');
        await db.collection('claims').updateOne(
            { _id: keep._id },
            {
                $set: {
                    generalAttachments: keepAtt,
                    updatedAt: new Date()
                }
            }
        );

        // Delete the duplicate claim
        console.log('🗑️ Deleting duplicate claim...');
        await db.collection('claims').deleteOne({ _id: drop._id });

        // Update project's claimsIdArray
        console.log('🔧 Updating project claimsIdArray...');
        const remainingClaims = await db.collection('claims').find({ projectId }).project({ _id: 1 }).toArray();
        const ids = remainingClaims.map(x => String(x._id));

        await db.collection('projects').updateOne(
            { _id: new ObjectId(projectId) },
            { $set: { claimsIdArray: ids } }
        );

        console.log('✅ Merged claims successfully!');
        console.log('📋 Remaining claims:', ids.length);

        // Verify final state
        const finalClaims = await db.collection('claims').find({ projectId }).toArray();
        console.log('🔍 Final verification:');
        finalClaims.forEach(c => {
            console.log('  - ID:', c._id, 'siteName:', c.siteName, 'attachments:', c.generalAttachments?.length || 0);
        });

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
    } finally {
        process.exit(0);
    }
}

mergeClaims();

