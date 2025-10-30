const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';

async function getCompaniesWithWebsites() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        const contractorsCollection = db.collection('contractors');
        
        // Get companies that have websites
        const companies = await contractorsCollection.find({
            website: { $exists: true, $ne: null, $ne: '' }
        }).toArray();
        
        console.log(`📊 Found ${companies.length} companies with websites`);
        return companies;
    } catch (error) {
        console.error('🔥 Error fetching companies:', error.message);
        return [];
    } finally {
        await client.close();
    }
}

async function updateCompanyWithPlaceholder(companyId, website) {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        const contractorsCollection = db.collection('contractors');
        
        const updateData = {
            about: `מידע על החברה נאסף מאתר האינטרנט: ${website}. הניתוח האוטומטי יושלם בקרוב.`,
            lastAnalyzed: new Date(),
            analysisStatus: 'pending'
        };
        
        const result = await contractorsCollection.updateOne(
            { _id: new ObjectId(companyId) },
            { $set: updateData }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`✅ Updated company ${companyId} with placeholder data`);
            return true;
        } else {
            console.log(`⚠️ No changes made for company ${companyId}`);
            return false;
        }
    } catch (error) {
        console.error(`🔥 Error updating company ${companyId}:`, error.message);
        return false;
    } finally {
        await client.close();
    }
}

async function main() {
    console.log('🚀 Starting simple company update...');
    
    const companies = await getCompaniesWithWebsites();
    
    if (companies.length === 0) {
        console.log('ℹ️ No companies found with websites');
        return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        console.log(`\n📋 Processing ${i + 1}/${companies.length}: ${company.name} (${company.website})`);
        
        const updated = await updateCompanyWithPlaceholder(company._id.toString(), company.website);
        
        if (updated) {
            successCount++;
        } else {
            errorCount++;
        }
        
        // Add small delay between updates
        if (i < companies.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    console.log(`\n📊 Update complete!`);
    console.log(`✅ Successfully updated: ${successCount} companies`);
    console.log(`❌ Failed: ${errorCount} companies`);
    console.log(`📈 Total processed: ${companies.length} companies`);
}

main().catch(error => {
    console.error('🔥 Script failed:', error);
    process.exit(1);
});
