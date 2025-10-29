const { SafetyMonitorService } = require('../server/services/safetyMonitorService');

async function run() {
    const service = new SafetyMonitorService();
    try {
        await service.initialize();
        const results = await service.fetchAndProcessReports();
        console.log('Incident/safety fetch completed. Saved/updated:', results.length);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await service.close();
    }
}

run();




