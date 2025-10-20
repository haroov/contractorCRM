const { SafetyMonitorService } = require('../server/services/safetyMonitorService');

async function testSafetyFetch() {
    try {
        console.log('🧪 Testing Safety Monitor Service...');

        const safetyService = new SafetyMonitorService();
        await safetyService.initialize();

        console.log('✅ Service initialized successfully');

        // Test fetch and process reports
        console.log('🔍 Fetching and processing reports...');
        const reports = await safetyService.fetchAndProcessReports();

        console.log('🎉 Success! Processed reports:');
        console.log(JSON.stringify(reports, null, 2));

        await safetyService.close();

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testSafetyFetch();

