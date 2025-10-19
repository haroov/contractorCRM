const express = require('express');
const { ObjectId } = require('mongodb');
const { SafetyMonitorService } = require('../services/safetyMonitorService');
const router = express.Router();

// Initialize safety monitor service
let safetyService = null;

// Initialize service on startup
const initSafetyService = async () => {
    if (!safetyService) {
        safetyService = new SafetyMonitorService();
        await safetyService.initialize();
    }
    return safetyService;
};

// Initialize on module load
initSafetyService().catch(console.error);

// GET /api/safety-reports - Get all reports with optional filters
router.get('/', async (req, res) => {
    try {
        const service = await initSafetyService();
        const { projectId, dateFrom, dateTo, limit = 50 } = req.query;

        const filters = {};
        if (projectId) filters.projectId = projectId;
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;

        const reports = await service.getAllReports(filters);

        // Apply limit
        const limitedReports = limit ? reports.slice(0, parseInt(limit)) : reports;

        res.json({
            success: true,
            data: limitedReports,
            total: reports.length
        });
    } catch (error) {
        console.error('Error fetching safety reports:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch safety reports'
        });
    }
});

// GET /api/safety-reports/:id - Get specific report
router.get('/:id', async (req, res) => {
    try {
        const service = await initSafetyService();
        const { id } = req.params;
        const collection = service.db.collection("safetyReports");
        const report = await collection.findOne({ _id: id });

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Safety report not found'
            });
        }

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error fetching safety report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch safety report'
        });
    }
});

// POST /api/safety-reports/fetch - Manual trigger for email fetch
router.post('/fetch', async (req, res) => {
    try {
        const service = await initSafetyService();
        console.log('🔄 Manual safety report fetch triggered');
        const reportData = await service.fetchAndProcessReports();

        res.json({
            success: true,
            message: 'Safety reports fetched successfully',
            data: reportData
        });
    } catch (error) {
        console.error('Error fetching safety reports:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch safety reports',
            details: error.message
        });
    }
});

// PATCH /api/safety-reports/:id/link - Manually link report to project
router.patch('/:id/link', async (req, res) => {
    try {
        const service = await initSafetyService();
        const { id } = req.params;
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'Project ID is required'
            });
        }

        const result = await service.linkReportToProject(id, projectId);

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Safety report not found'
            });
        }

        res.json({
            success: true,
            message: 'Report linked to project successfully'
        });
    } catch (error) {
        console.error('Error linking report to project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to link report to project'
        });
    }
});

// GET /api/safety-reports/project/:projectId - Get all safety reports for a project
router.get('/project/:projectId', async (req, res) => {
    try {
        const service = await initSafetyService();
        const { projectId } = req.params;
        const reports = await service.getReportsForProject(projectId);

        res.json({
            success: true,
            data: reports,
            total: reports.length
        });
    } catch (error) {
        console.error('Error fetching project safety reports:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project safety reports'
        });
    }
});

// GET /api/safety-reports/stats/summary - Get safety statistics summary
router.get('/stats/summary', async (req, res) => {
    try {
        const service = await initSafetyService();
        const { projectId, days = 30 } = req.query;

        let query = {};
        if (projectId) {
            query.projectId = new ObjectId(projectId);
        }

        // Add date filter for last N days
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        query.createdAt = { $gte: daysAgo };

        const collection = service.db.collection("safetyReports");
        const reports = await collection.find(query).sort({ date: -1 }).toArray();

        if (reports.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalReports: 0,
                    averageScore: 0,
                    latestScore: 0,
                    trend: 'stable',
                    reports: []
                }
            });
        }

        // Calculate statistics
        const scores = reports.map(r => r.score);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const latestScore = reports[0].score;

        // Calculate trend (comparing first half vs second half)
        const midPoint = Math.floor(reports.length / 2);
        const firstHalf = reports.slice(0, midPoint);
        const secondHalf = reports.slice(midPoint);

        const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.score, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.score, 0) / secondHalf.length;

        let trend = 'stable';
        if (secondHalfAvg > firstHalfAvg + 5) trend = 'improving';
        else if (secondHalfAvg < firstHalfAvg - 5) trend = 'declining';

        res.json({
            success: true,
            data: {
                totalReports: reports.length,
                averageScore: Math.round(averageScore),
                latestScore: latestScore,
                trend: trend,
                reports: reports.slice(0, 10) // Last 10 reports
            }
        });
    } catch (error) {
        console.error('Error fetching safety statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch safety statistics'
        });
    }
});

// GET /api/safety-reports/debug - Debug environment variables
router.get('/debug', async (req, res) => {
    try {
        res.json({
            success: true,
            env: {
                GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? '✅ מוגדר' : '❌ לא מוגדר',
                GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? '✅ מוגדר' : '❌ לא מוגדר',
                GMAIL_REDIRECT_URI: process.env.GMAIL_REDIRECT_URI ? '✅ מוגדר' : '❌ לא מוגדר',
                GMAIL_TOKEN: process.env.GMAIL_TOKEN ? '✅ מוגדר' : '❌ לא מוגדר',
                MONGODB_URI: process.env.MONGODB_URI ? '✅ מוגדר' : '❌ לא מוגדר'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/safety-reports/test - Test endpoint
router.get('/test', async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Safety reports API is working',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/safety-reports/force-fetch - Force fetch new emails (for testing)
router.post('/force-fetch', async (req, res) => {
    try {
        const service = await initSafetyService();
        const result = await service.fetchAndProcessReports();

        res.json({
            success: true,
            message: 'Force fetch completed',
            reportsProcessed: result.length,
            data: result
        });
    } catch (error) {
        console.error('Error in force fetch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to force fetch reports',
            details: error.message
        });
    }
});

// POST /api/safety-reports/historical-fetch - Fetch all historical reports
router.post('/historical-fetch', async (req, res) => {
    try {
        const service = await initSafetyService();
        const result = await service.fetchAllHistoricalReports();
        
        res.json({
            success: true,
            message: 'Historical fetch completed',
            reportsProcessed: result.length,
            data: result
        });
    } catch (error) {
        console.error('Error in historical fetch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch historical reports',
            details: error.message
        });
    }
});

// DELETE /api/safety-reports/clear-all - Clear all documents from safetyReports collection
router.delete('/clear-all', async (req, res) => {
    try {
        const service = await initSafetyService();
        const result = await service.clearAllReports();
        
        res.json({
            success: true,
            message: `Cleared ${result.deletedCount} documents from safetyReports collection.`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error clearing safetyReports collection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear safetyReports collection',
            details: error.message
        });
    }
});

// GET /api/safety-reports/unmatched - Get unmatched reports for manual linking
router.get('/unmatched', async (req, res) => {
    try {
        const service = await initSafetyService();
        const collection = service.db.collection("safetyReports");
        const unmatchedReports = await collection.find({
            projectId: null
        }).sort({ createdAt: -1 }).toArray();

        res.json({
            success: true,
            data: unmatchedReports,
            total: unmatchedReports.length
        });
    } catch (error) {
        console.error('Error fetching unmatched reports:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch unmatched reports'
        });
    }
});

module.exports = router;
