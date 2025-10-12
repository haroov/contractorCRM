const { Router } = require("express");

console.log("🚀 Loading company-analysis.js route");

const router = Router();

console.log("✅ Company analysis router created successfully");

// Simple test function for now
async function analyzeCompanyWebsite(websiteUrl) {
    console.log("🔍 Analyzing company website:", websiteUrl);
    
    // Return mock data for testing
    return {
        companyName: "חברת בניה לדוגמה",
        about: "חברה מובילה בתחום הבניה והפיתוח. מתמחה בפרויקטים מגוונים כולל בנייני מגורים, מבני ציבור ותשתיות.",
        safety: "החברה מחזיקה בתקני בטיחות מתקדמים כולל ISO 45001 ותעודות בטיחות נוספות.",
        projects: "בין הפרויקטים הבולטים: בנייני מגורים בתל אביב, מרכזי קניות ומבני ציבור.",
        logoUrl: "/assets/logo.svg"
    };
}

/**
 * POST /analyze-company - Analyze company website
 */
router.post("/analyze-company", async (req, res) => {
    console.log("🎯 POST /analyze-company route hit");
    try {
        const { website } = req.body;

        if (!website) {
            return res.status(400).json({
                success: false,
                error: "Website URL is required"
            });
        }

        console.log("🌐 Analyzing company website:", website);

        const analysisResult = await analyzeCompanyWebsite(website);

        res.json({
            success: true,
            data: analysisResult
        });

    } catch (error) {
        console.error("❌ Error in company analysis:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to analyze company website"
        });
    }
});

module.exports = router;
