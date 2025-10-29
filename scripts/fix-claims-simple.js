require('dotenv').config();
const { getDb } = require('../server/lib/mongo');
const { ObjectId } = require('mongodb');

async function fixClaims() {
    try {
        console.log('🔗 Connecting to database...');
        const db = await getDb();

        // Find the project
        console.log('🔍 Looking for project...');
        const projects = await db.collection('projects').find({}).toArray();
        const project = projects.find(p => p.projectName && p.projectName.includes('רמת השרון מגרש 27+28'));

        if (!project) {
            console.error('❌ Project not found');
            return;
        }

        console.log('✅ Found project:', project.projectName, project._id);

        // Find Safeguard claims with null projectId
        console.log('🔍 Looking for unlinked Safeguard claims...');
        const claims = await db.collection('claims').find({
            'source.vendor': 'Safeguard',
            projectId: null
        }).toArray();

        console.log('📋 Found', claims.length, 'unlinked claims');

        if (claims.length === 0) {
            console.log('✅ No claims to fix');
            return;
        }

        // Update the claims
        console.log('🔧 Updating claims...');
        const result = await db.collection('claims').updateMany(
            { 'source.vendor': 'Safeguard', projectId: null },
            {
                $set: {
                    projectId: String(project._id),
                    projectName: project.projectName,
                    siteName: project.projectName,
                    updatedAt: new Date()
                }
            }
        );

        console.log('✅ Updated', result.modifiedCount, 'claims');

        // Update project's claimsIdArray
        console.log('🔧 Updating project claimsIdArray...');
        const claimIds = await db.collection('claims').find({ projectId: String(project._id) }).project({ _id: 1 }).toArray();
        const ids = claimIds.map(x => String(x._id));

        await db.collection('projects').updateOne(
            { _id: project._id },
            { $set: { claimsIdArray: ids } }
        );

        console.log('✅ Updated project claimsIdArray with', ids.length, 'claims');

        // Verify the fix
        console.log('🔍 Verifying fix...');
        const updatedClaims = await db.collection('claims').find({ projectId: String(project._id) }).toArray();
        console.log('📋 Project now has', updatedClaims.length, 'claims:');
        updatedClaims.forEach(c => {
            console.log('  - ID:', c._id, 'siteName:', c.siteName, 'status:', c.status);
        });

        console.log('🎉 Fix completed successfully!');

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
    } finally {
        process.exit(0);
    }
}

fixClaims();

