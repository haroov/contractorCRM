const { Router } = require("express");
const cheerio = require('cheerio');

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

    // Overall timeout for the entire analysis (45 seconds)
    const overallTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout after 45 seconds')), 45000);
    });

    try {
        return await Promise.race([
            analyzeCompanyWebsiteInternal(websiteUrl),
            overallTimeout
        ]);
    } catch (error) {
        console.error("❌ Error in AI analysis:", error);
        return {
            companyName: "חברה לא זוהתה",
            about: `לא ניתן לנתח את האתר ${websiteUrl} כרגע: ${error.message}. אנא נסה שוב מאוחר יותר.`,
            safety: "מידע על בטיחות לא זמין",
            projects: "מידע על פרויקטים לא זמין",
            logoUrl: null
        };
    }
}

async function analyzeCompanyWebsiteInternal(websiteUrl) {
    try {
        // Simplified: Use ChatGPT API directly - ask it to analyze the website using its knowledge
        console.log('🌐 Using ChatGPT API for direct analysis');
        
        // Normalize URL
        const normalizedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
        
        const systemPrompt = `אתה ChatGPT. אתה מנתח חברות בניה/נדל"ן בישראל. השתמש בידע שלך ובמידע מהאינטרנט לנתח את החברה.`;
        const userPrompt = `נתח את החברה מהאתר ${normalizedUrl} וכלול:
1. שם החברה
2. אודות החברה - תיאור מפורט (~1000 מילים) על החברה, ההיסטוריה שלה, תחומי הפעילות, ניסיון, פרויקטים בולטים
3. מידע על בטיחות - תקנים, תעודות, מדיניות בטיחות
4. פרויקטים - רשימת פרויקטים/תכניות שהחברה ביצעה או מבצעת (מערך)
5. לוגו - URL של הלוגו של החברה אם אתה יודע אותו

החזר רק JSON תקין ללא טקסט נוסף, עם המבנה: {"companyName":"","about":"","safety":"","projects":[],"logoUrl":""}`;

        // Use chat completions API directly (no web_search tools)
        if (openai && openai.chat && openai.chat.completions && typeof openai.chat.completions.create === 'function') {
            console.log('🌐 Using OpenAI chat completions API');
            try {
                const response = await Promise.race([
                    openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.0,
                        max_tokens: 4000
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI API timeout')), 30000))
                ]);

                const responseText = response.choices?.[0]?.message?.content;
                console.log('📄 Response text length:', responseText?.length || 0);
                
                if (responseText) {
                    let cleaned = responseText.trim();
                    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    
                    try {
                        const parsed = JSON.parse(cleaned);
                        console.log('✅ Using ChatGPT API analysis');
                        return parsed;
                    } catch (parseErr) {
                        console.error('❌ Failed to parse JSON from response:', parseErr.message);
                        console.error('📄 Cleaned text:', cleaned.substring(0, 1000));
                        // Try to extract JSON from the response
                        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            try {
                                const parsed = JSON.parse(jsonMatch[0]);
                                console.log('✅ Extracted and parsed JSON from response');
                                return parsed;
                            } catch (_) {}
                        }
                        throw new Error(`Failed to parse JSON from ChatGPT response: ${parseErr.message}`);
                    }
                } else {
                    throw new Error('ChatGPT API returned empty response');
                }
            } catch (err) {
                console.error('❌ ChatGPT API call failed:', err?.message || err);
                throw err;
            }
        } else {
            throw new Error('OpenAI chat completions API not available');
        }
    } catch (error) {
        console.error("❌ Error in AI analysis internal:", error);
        throw error; // Re-throw to be handled by wrapper
    }
}

// Simplified: Using only ChatGPT API direct calls - no web_search tools, no page fetching

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

        // Skip domain mismatch check for Hebrew company names as they don't match domain names
        // This check was causing issues with legitimate Hebrew company names
        console.log('🔎 Skipping domain mismatch check for Hebrew company names');

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
