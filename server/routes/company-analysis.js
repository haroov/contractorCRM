const { Router } = require("express");
const OpenAI = require("openai");
const fetch = require("node-fetch");

const router = Router();

// Initialize OpenAI client - compatible with openai v3.3.0
const client = new OpenAI.OpenAIApi(new OpenAI.Configuration({
    apiKey: process.env.OPENAI_API_KEY
}));

// Check if API key is available
if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is not set!");
} else {
    console.log("✅ OPENAI_API_KEY is set:", process.env.OPENAI_API_KEY.substring(0, 10) + "...");
}

/**
 * Schema for company website analysis
 */
const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
        companyName: { 
            type: "string", 
            description: "שם החברה" 
        },
        about: { 
            type: "string", 
            description: "תיאור החברה - מידע על החברה, תחומי פעילות, היסטוריה" 
        },
        safety: { 
            type: "string", 
            description: "מידע על בטיחות - תקני בטיחות, הסמכות, תעודות" 
        },
        projects: { 
            type: "string", 
            description: "פרויקטים - פרויקטים בולטים, לקוחות, הישגים" 
        },
        logoUrl: { 
            type: "string", 
            description: "כתובת הלוגו של החברה" 
        }
    },
    required: ["companyName", "about"]
};

/**
 * Build system prompt for company analysis
 */
function buildSystemPrompt() {
    return `אתה מנתח אתרי אינטרנט של חברות בניה וקבלנות. המשימה: חילוץ מידע מובנה על החברה לפי הסכימה המצורפת. התמקד במידע על החברה, בטיחות, ופרויקטים. החזר JSON בלבד ללא הסברים נוספים.`;
}

/**
 * Analyze company website using OpenAI
 */
async function analyzeCompanyWebsite(websiteUrl) {
    try {
        console.log("🔍 Analyzing company website:", websiteUrl);
        
        const response = await client.createChatCompletion({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: buildSystemPrompt()
                },
                {
                    role: "user",
                    content: `נתח את האתר הבא וחלץ מידע על החברה: ${websiteUrl}

חלץ את המידע הבא וחזור JSON בלבד:
- companyName: שם החברה
- about: תיאור החברה (עד 500 תווים)
- safety: מידע על בטיחות ותקנים (עד 300 תווים)
- projects: פרויקטים בולטים (עד 300 תווים)
- logoUrl: כתובת הלוגו אם נמצא

החזר רק JSON ללא הסברים נוספים.`
                }
            ],
            max_tokens: 1000,
            temperature: 0.3
        });

        console.log("📡 OpenAI response status:", response.status);
        console.log("📡 OpenAI response choices length:", response.data?.choices?.length);

        const content = response.data?.choices?.[0]?.message?.content;
        console.log("📄 Raw content from OpenAI:", content);

        if (!content) {
            throw new Error("No content in AI response");
        }

        // Clean up the content - remove markdown formatting if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        console.log("🧹 Cleaned content:", cleanContent);

        const analysisResult = JSON.parse(cleanContent);
        console.log("✅ Parsed analysis result:", analysisResult);

        return analysisResult;

    } catch (error) {
        console.error("❌ Error analyzing company website:", error);
        throw error;
    }
}

/**
 * POST /analyze-company - Analyze company website
 */
router.post("/analyze-company", async (req, res) => {
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
