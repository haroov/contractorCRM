const { Router } = require("express");

console.log("🚀 🚀 🚀 Loading company-analysis-v2.js route - UPDATED v0.0.8 - FORCE DEPLOY");

const router = Router();

console.log("✅ Company analysis router created successfully");
console.log("🔍 🔍 🔍 RENDER REDEPLOY FORCE - v0.0.8 - OpenAI debugging enabled");

// Initialize OpenAI client - support both SDK v4 and v3 (legacy)
let openai;
let openaiClientVersion = 'unknown';
try {
    console.log("🔍 Attempting to require OpenAI module...");
    const OpenAI = require('openai');
    console.log("✅ OpenAI module required successfully");
    console.log("🔍 OpenAI constructor type:", typeof OpenAI);
    console.log("🔍 OpenAI API key available:", !!process.env.OPENAI_API_KEY);

    // Prefer SDK v4 style (class constructor)
    if (typeof OpenAI === 'function') {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        openaiClientVersion = 'v4-class';
    } else if (OpenAI && OpenAI.default && typeof OpenAI.default === 'function') {
        openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });
        openaiClientVersion = 'v4-default-class';
    } else if (OpenAI && (OpenAI.Configuration || OpenAI.OpenAIApi)) {
        // SDK v3 style: { Configuration, OpenAIApi }
        const { Configuration, OpenAIApi } = OpenAI;
        const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
        openai = new OpenAIApi(configuration);
        openaiClientVersion = 'v3-api';
    } else {
        console.log("⚠️ OpenAI module shape not recognized; skipping initialization");
        openai = null;
    }

    if (openai) {
        console.log("✅ OpenAI client initialized successfully (", openaiClientVersion, ")");
    }
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
- about: סיכום מקיף של החברה באורך של כ-1,000 מילים המתמקד בתחום הבניה והנדל"ן, פרויקטים בולטים והשקעות בבטיחות. כלול: היסטוריה של החברה, תחומי התמחות ספציפיים בבניה ונדל"ן, פרויקטים משמעותיים שביצעה החברה, השקעות ותקני בטיחות, מחויבות לקיימות, צוות מקצועי, טכנולוגיות מתקדמות בבניה, אחריות חברתית
- safety: מידע מפורט על תקני בטיחות ואיכות, השקעות בבטיחות, תעודות וסטנדרטים
- projects: פרויקטים בולטים של החברה בתחום הבניה והנדל"ן
- logoUrl: קישור ישיר לתמונה של הלוגו של החברה (לא לוגו של אתרים אחרים)

חשוב: החזר רק JSON תקין ללא טקסט נוסף.`;

        const userPrompt = `אנא נתח את האתר הבא: ${websiteUrl}

התמקד במיוחד ב:
1. דף "אודות" או "About" - חפש מידע על היסטוריה, תחומי התמחות, צוות
2. דף "פרויקטים" או "Projects" - חפש פרויקטים בולטים בתחום הבניה והנדל"ן
3. דף "בטיחות" או "Safety" - חפש השקעות בבטיחות, תקנים, תעודות
4. הלוגו של החברה (לא לוגו של אתרים אחרים)

החזר סיכום מקיף של החברה באורך של כ-1,000 מילים המתמקד בתחום הבניה והנדל"ן, פרויקטים והשקעות בבטיחות.`;

        console.log("📝 Sending request to OpenAI... (", openaiClientVersion, ")");

        let aiResponse;
        if (openai && openai.chat && openai.chat.completions && typeof openai.chat.completions.create === 'function') {
            // SDK v4 style
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 4000
            });
            console.log("✅ Received response from OpenAI (v4)");
            aiResponse = response.choices?.[0]?.message?.content;
        } else if (openai && typeof openai.createChatCompletion === 'function') {
            // SDK v3 style
            const response = await openai.createChatCompletion({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 4000
            });
            console.log("✅ Received response from OpenAI (v3)");
            aiResponse = response.data?.choices?.[0]?.message?.content || response.data?.choices?.[0]?.text;
        } else {
            throw new Error("Unsupported OpenAI client; no chat completion method available");
        }

        
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
