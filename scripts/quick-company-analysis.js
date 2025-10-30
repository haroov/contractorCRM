const { MongoClient, ObjectId } = require('mongodb');
const fetch = require('node-fetch');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';
const API_BASE_URL = process.env.API_BASE_URL || 'https://contractorcrm-api.onrender.com';

async function quickAnalyzeCompany(websiteUrl) {
    console.log(`🔍 Quick analyzing: ${websiteUrl}`);
    
    // Try with very short timeout first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/company-analysis/analyze-company`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ website: websiteUrl }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ HTTP ${response.status}: ${errorText}`);
            return null;
        }
        
        const result = await response.json();
        
        if (!result.success) {
            console.error(`❌ Analysis failed: ${result.error}`);
            return null;
        }
        
        console.log(`✅ Quick analysis successful for ${websiteUrl}`);
        return result.data;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error(`⏰ Timeout after 10s for ${websiteUrl}`);
        } else {
            console.error(`🔥 Error analyzing ${websiteUrl}:`, error.message);
        }
        return null;
    }
}

async function updateCompanyInDB(companyId, analysisData) {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        const contractorsCollection = db.collection('contractors');
        
        const updateData = {
            lastAnalyzed: new Date(),
            analysisStatus: 'completed'
        };
        
        if (analysisData && analysisData.about) {
            updateData.about = analysisData.about;
        }
        
        if (analysisData && analysisData.safety) {
            updateData.safetyInfo = analysisData.safety;
        }
        
        if (analysisData && analysisData.projects) {
            updateData.projectsInfo = analysisData.projects;
        }
        
        if (analysisData && analysisData.logoUrl) {
            updateData.logoUrl = analysisData.logoUrl;
        }
        
        const result = await contractorsCollection.updateOne(
            { _id: new ObjectId(companyId) },
            { $set: updateData }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`✅ Updated company ${companyId}`);
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

async function getCompaniesToAnalyze() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        const contractorsCollection = db.collection('contractors');
        
        // Get companies that have websites and need analysis
        const companies = await contractorsCollection.find({
            $and: [
                { website: { $exists: true, $ne: null, $ne: '' } },
                { 
                    $or: [
                        { analysisStatus: { $exists: false } },
                        { analysisStatus: 'pending' },
                        { analysisStatus: 'failed' }
                    ]
                }
            ]
        }).limit(5).toArray(); // Only process 5 companies at a time
        
        console.log(`📊 Found ${companies.length} companies to analyze`);
        return companies;
    } catch (error) {
        console.error('🔥 Error fetching companies:', error.message);
        return [];
    } finally {
        await client.close();
    }
}

async function main() {
    console.log('🚀 Starting quick company analysis (5 companies max)...');
    
    const companies = await getCompaniesToAnalyze();
    
    if (companies.length === 0) {
        console.log('ℹ️ No companies found that need analysis');
        return;
    }
    
    let successCount = 0;
    let timeoutCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        console.log(`\n📋 Processing ${i + 1}/${companies.length}: ${company.name} (${company.website})`);
        
        // Normalize website URL
        let websiteUrl = company.website;
        if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
            websiteUrl = 'https://' + websiteUrl;
        }
        
        const analysisData = await quickAnalyzeCompany(websiteUrl);
        
        if (analysisData) {
            const updated = await updateCompanyInDB(company._id.toString(), analysisData);
            if (updated) {
                successCount++;
            } else {
                errorCount++;
            }
        } else {
            // Mark as failed
            await updateCompanyInDB(company._id.toString(), null);
            timeoutCount++;
        }
        
        // Add delay between requests
        if (i < companies.length - 1) {
            console.log('⏳ Waiting 5 seconds before next analysis...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log(`\n📊 Quick analysis complete!`);
    console.log(`✅ Successfully analyzed: ${successCount} companies`);
    console.log(`⏰ Timeout: ${timeoutCount} companies`);
    console.log(`❌ Failed: ${errorCount} companies`);
    console.log(`📈 Total processed: ${companies.length} companies`);
}

main().catch(error => {
    console.error('🔥 Script failed:', error);
    process.exit(1);
});
