const { Router } = require("express");

console.log("🚀 🚀 🚀 Loading company-analysis-v2.js route - UPDATED v0.0.7 - NEW FILE");

const router = Router();

console.log("✅ Company analysis router created successfully");
console.log("🔍 🔍 🔍 RENDER REDEPLOY FORCE - v0.0.7 - OpenAI debugging enabled");

// Initialize OpenAI client - using dynamic require to avoid constructor issues
let openai;
try {
    console.log("🔍 Attempting to require OpenAI module...");
    const OpenAI = require('openai');
    console.log("✅ OpenAI module required successfully");
    console.log("🔍 OpenAI constructor type:", typeof OpenAI);
    console.log("🔍 OpenAI API key available:", !!process.env.OPENAI_API_KEY);

    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    console.log("✅ OpenAI client initialized successfully");
} catch (error) {
    console.error("❌ Error initializing OpenAI:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Error stack:", error.stack);
    openai = null;
}

// Real AI function using ChatGPT API
async function analyzeCompanyWebsite(websiteUrl) {
    console.log("🔍 Analyzing company website with ChatGPT API:", websiteUrl);

    // Check if OpenAI is available
    if (!openai) {
        console.error("❌ OpenAI client not available");
        return {
            companyName: "חברה לא זוהתה",
            about: `שגיאה בטעינת מערכת ה-AI. אנא נסה שוב מאוחר יותר.`,
            safety: "מידע על בטיחות לא זמין",
            projects: "מידע על פרויקטים לא זמין",
            logoUrl: null
        };
    }

    try {
        // Build the prompt for ChatGPT
        const systemPrompt = `אתה מומחה לניתוח אתרי אינטרנט של חברות בניה ונדל"ן. תפקידך לנתח אתר אינטרנט של חברה ולהחזיר מידע מקיף על החברה.

החזר את המידע בפורמט JSON עם השדות הבאים:
- companyName: שם החברה
- about: סיכום מקיף של החברה בהיקף עמוד A4 (לפחות 1000 מילים) הכולל: היסטוריה, תחומי התמחות, פרויקטים בולטים, תקני איכות ובטיחות, מחויבות לקיימות, צוות מקצועי, טכנולוגיות מתקדמות, אחריות חברתית
- safety: מידע על תקני בטיחות ואיכות
- projects: פרויקטים בולטים של החברה
- logoUrl: קישור ישיר לתמונה של הלוגו של החברה (לא לוגו של אתרים אחרים)

חשוב: החזר רק JSON תקין ללא טקסט נוסף.`;

        const userPrompt = `אנא נתח את האתר הבא: ${websiteUrl}

התמקד במיוחד ב:
1. דף "אודות" או "About"
2. דף "פרויקטים" או "Projects" 
3. דף "בטיחות" או "Safety"
4. הלוגו של החברה (לא לוגו של אתרים אחרים)

החזר סיכום מקיף של החברה בהיקף עמוד A4.`;

        console.log("📝 Sending request to OpenAI...");

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            temperature: 0.3,
            max_tokens: 4000
        });

        console.log("✅ Received response from OpenAI");

        const aiResponse = response.choices?.[0]?.message?.content;
        if (!aiResponse) {
            throw new Error("No content in AI response");
        }

        console.log("📄 Raw AI response:", aiResponse);

        // Clean the response and parse JSON
        let cleanedResponse = aiResponse.trim();
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        console.log("🧹 Cleaned response:", cleanedResponse);

        const analysisResult = JSON.parse(cleanedResponse);

        console.log("✅ Successfully parsed AI response:", analysisResult);

        return analysisResult;

    } catch (error) {
        console.error("❌ Error in AI analysis:", error);

        // Fallback to basic analysis
        return {
            companyName: "חברה לא זוהתה",
            about: `לא ניתן לנתח את האתר ${websiteUrl} כרגע. אנא נסה שוב מאוחר יותר או בדוק שהכתובת נכונה.`,
            safety: "מידע על בטיחות לא זמין",
            projects: "מידע על פרויקטים לא זמין",
            logoUrl: null
        };
    }
}

/**
 * POST /analyze-company - Analyze company website
 */
router.post("/analyze-company", async (req, res) => {
    console.log("🎯 🎯 🎯 POST /analyze-company route hit - UPDATED");
    try {
        const { website } = req.body;

        if (!website) {
            console.log("❌ No website URL provided");
            return res.status(400).json({
                success: false,
                error: "Website URL is required"
            });
        }

        console.log("🌐 Analyzing company website:", website);
        console.log("🔑 OpenAI API Key available:", !!process.env.OPENAI_API_KEY);

        const analysisResult = await analyzeCompanyWebsite(website);

        console.log("📊 Analysis completed, returning result:", {
            companyName: analysisResult.companyName,
            aboutLength: analysisResult.about?.length || 0,
            hasLogo: !!analysisResult.logoUrl
        });

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
