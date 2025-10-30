const { MongoClient, ObjectId } = require('mongodb');
const fetch = require('node-fetch');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';
const API_BASE_URL = process.env.API_BASE_URL || 'https://contractorcrm-api.onrender.com';

async function analyzeCompanyWebsite(websiteUrl) {
    console.log(`🔍 Analyzing: ${websiteUrl}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/company-analysis/analyze-company`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ website: websiteUrl }),
            timeout: 30000 // 30 seconds timeout
        });

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

        console.log(`✅ Analysis successful for ${websiteUrl}`);
        return result.data;
    } catch (error) {
        console.error(`🔥 Error analyzing ${websiteUrl}:`, error.message);
        return null;
    }
}

async function updateCompanyInDB(companyId, analysisData) {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        const contractorsCollection = db.collection('contractors');
        
        const updateData = {};
        
        if (analysisData.about) {
            updateData.about = analysisData.about;
        }
        
        if (analysisData.safety) {
            updateData.safetyInfo = analysisData.safety;
        }
        
        if (analysisData.projects) {
            updateData.projectsInfo = analysisData.projects;
        }
        
        if (analysisData.logoUrl) {
            updateData.logoUrl = analysisData.logoUrl;
        }
        
        if (Object.keys(updateData).length > 0) {
            updateData.lastAnalyzed = new Date();
            
            const result = await contractorsCollection.updateOne(
                { _id: new ObjectId(companyId) },
                { $set: updateData }
            );
            
            if (result.modifiedCount > 0) {
                console.log(`✅ Updated company ${companyId} with analysis data`);
                return true;
            } else {
                console.log(`⚠️ No changes made for company ${companyId}`);
                return false;
            }
        } else {
            console.log(`⚠️ No valid data to update for company ${companyId}`);
            return false;
        }
    } catch (error) {
        console.error(`🔥 Error updating company ${companyId}:`, error.message);
        return false;
    } finally {
        await client.close();
    }
}

async function getCompaniesWithWebsites() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        const contractorsCollection = db.collection('contractors');
        
        // Get companies that have websites but haven't been analyzed recently or don't have about info
        const companies = await contractorsCollection.find({
            $and: [
                { website: { $exists: true, $ne: null, $ne: '' } },
                { 
                    $or: [
                        { about: { $exists: false } },
                        { about: { $eq: '' } },
                        { about: { $eq: null } },
                        { lastAnalyzed: { $exists: false } },
                        { lastAnalyzed: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 days ago
                    ]
                }
            ]
        }).toArray();
        
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
    console.log('🚀 Starting bulk company analysis...');
    
    const companies = await getCompaniesWithWebsites();
    
    if (companies.length === 0) {
        console.log('ℹ️ No companies found that need analysis');
        return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        console.log(`\n📋 Processing ${i + 1}/${companies.length}: ${company.name} (${company.website})`);
        
        // Normalize website URL
        let websiteUrl = company.website;
        if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
            websiteUrl = 'https://' + websiteUrl;
        }
        
        const analysisData = await analyzeCompanyWebsite(websiteUrl);
        
        if (analysisData) {
            const updated = await updateCompanyInDB(company._id.toString(), analysisData);
            if (updated) {
                successCount++;
            } else {
                errorCount++;
            }
        } else {
            errorCount++;
        }
        
        // Add delay between requests to avoid overwhelming the server
        if (i < companies.length - 1) {
            console.log('⏳ Waiting 3 seconds before next analysis...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log(`\n📊 Analysis complete!`);
    console.log(`✅ Successfully analyzed: ${successCount} companies`);
    console.log(`❌ Failed: ${errorCount} companies`);
    console.log(`📈 Total processed: ${companies.length} companies`);
}

// Handle command line arguments
if (process.argv[2] === '--test-single') {
    const testUrl = process.argv[3] || 'https://www.yanush.co.il';
    console.log(`🧪 Testing single company analysis: ${testUrl}`);
    analyzeCompanyWebsite(testUrl).then(data => {
        console.log('📊 Result:', data);
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
} else {
    main().catch(error => {
        console.error('🔥 Script failed:', error);
        process.exit(1);
    });
}
