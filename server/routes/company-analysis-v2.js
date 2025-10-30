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
        // Use ChatGPT API with web_search directly - simpler and faster approach
        console.log('🌐 Using ChatGPT API with web_search for direct analysis');
        
        const systemPrompt = `אתה מנתח אתרי אינטרנט של חברות בניה/ndl"ן. השתמש ב-web_search כדי למצוא מידע עדכני מהאתר ${websiteUrl}.`;
        const userPrompt = `נתח את החברה מהאתר ${websiteUrl} וכלול:
1. שם החברה
2. אודות החברה - תיאור מפורט (~1000 מילים) על החברה, ההיסטוריה שלה, תחומי הפעילות, ניסיון, פרויקטים בולטים
3. מידע על בטיחות - תקנים, תעודות, מדיניות בטיחות
4. פרויקטים - רשימת פרויקטים/תכניות שהחברה ביצעה או מבצעת
5. לוגו - URL של הלוגו של החברה (אם נמצא)

החזר רק JSON תקין עם המפתחות: {"companyName":"","about":"","safety":"","projects":[],"logoUrl":""}
כל מידע חייב להיות רק מהאתר ${websiteUrl}.`;

        // Try Responses API first (faster)
        if (openai && openai.responses && typeof openai.responses.create === 'function') {
            console.log('🌐 Trying OpenAI web_search tool via Responses API');
            const systemPromptSearch = `אתה מנתח אתרי אינטרנט של חברות בניה/נדל"ן. בצע web_search וחפש אך ורק מידע מהדומיין הבא: ${websiteUrl}. אם המידע אינו מהדומיין הזה, אל תשתמש בו. החזר JSON בלבד.`;
            const userPromptSearch = `נתח את האתר ${websiteUrl} עם דגש על עמודי אודות/פרויקטים/בטיחות. החזר JSON עם {companyName, about (~1000 מילים), safety, projects (מערך), logoUrl (מאותו דומיין בלבד)}.`;

            try {
                const resp = await Promise.race([
                    openai.responses.create({
                        model: 'gpt-4o-mini',
                        input: [
                            { role: 'system', content: systemPromptSearch },
                            { role: 'user', content: userPromptSearch }
                        ],
                        tools: [{ type: 'web_search' }],
                        temperature: 0.0,
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI web_search timeout')), 25000))
                ]);

                // Attempt to unify content extraction from Responses API
                const responseText = resp?.output_text || resp?.content?.[0]?.text || resp?.choices?.[0]?.message?.content;
                console.log('📄 Responses API text length:', responseText?.length || 0);
                
                if (responseText) {
                    let cleaned = responseText.trim();
                    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    
                    try {
                        const parsed = JSON.parse(cleaned);
                        // Sanitize logo to same domain
                        try {
                            const base = new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`);
                            const safe = parsed?.logoUrl ? new URL(parsed.logoUrl, base.origin).href : null;
                            parsed.logoUrl = safe && new URL(safe).origin === base.origin ? safe : null;
                        } catch (_) { }
                        console.log('✅ Using web_search-based analysis via Responses API');
                        return parsed;
                    } catch (parseErr) {
                        console.error('❌ Failed to parse JSON from Responses API:', parseErr.message);
                        // Try to extract JSON from the response
                        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            try {
                                const parsed = JSON.parse(jsonMatch[0]);
                                console.log('✅ Extracted and parsed JSON from Responses API');
                                return parsed;
                            } catch (_) {}
                        }
                        throw new Error(`Failed to parse JSON from Responses API: ${parseErr.message}`);
                    }
                } else {
                    console.warn('⚠️ Responses API returned empty response');
                }
            } catch (err) {
                console.warn('⚠️ web_search via Responses API failed, falling back to on-site crawl:', err?.message || err);
            }
        }

        // Try OpenAI chat completions with web_search tool (primary method if Responses API fails)
        // Note: web_search might require a specific model or different approach
        if (openai && openai.chat && openai.chat.completions && typeof openai.chat.completions.create === 'function') {
            console.log('🌐 Trying OpenAI chat completions with web_search tool');
            try {
                // Try with explicit web_search instruction first
                const webSearchPrompt = `${userPrompt}\n\nחשוב: השתמש ב-web_search של ChatGPT כדי לחפש מידע מהאתר ${websiteUrl}.`;
                
                const response = await Promise.race([
                    openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: webSearchPrompt }
                        ],
                        temperature: 0.0,
                        max_tokens: 4000,
                        // Some models support web_search via tools, but try without first if it fails
                        tools: [{ type: 'web_search' }]
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI web_search timeout')), 30000))
                ]);

                const responseText = response.choices?.[0]?.message?.content;
                console.log('📄 Raw response text length:', responseText?.length || 0);
                console.log('📄 First 500 chars:', responseText?.substring(0, 500) || 'empty');
                
                if (responseText) {
                    let cleaned = responseText.trim();
                    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    
                    try {
                        const parsed = JSON.parse(cleaned);
                        console.log('✅ Using web_search-based analysis via chat completions');
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
                console.warn('⚠️ web_search via chat completions with tools failed, trying without tools:', err?.message || err);
                
                // Fallback: try without tools array - let ChatGPT use its built-in web search capabilities
                try {
                    const fallbackPrompt = `אתה ChatGPT עם יכולת חיפוש באינטרנט. חפש מידע על החברה מהאתר ${websiteUrl} ונתח:
- שם החברה
- אודות החברה (תיאור מפורט ~1000 מילים)
- מידע על בטיחות
- פרויקטים
- לוגו (URL אם נמצא)

החזר JSON עם המבנה: {"companyName":"","about":"","safety":"","projects":[],"logoUrl":""}`;
                    
                    const fallbackResponse = await Promise.race([
                        openai.chat.completions.create({
                            model: 'gpt-4o-mini',
                            messages: [
                                { role: 'system', content: 'אתה ChatGPT עם גישה לחיפוש באינטרנט. חפש מידע מהאתר שצוין.' },
                                { role: 'user', content: fallbackPrompt }
                            ],
                            temperature: 0.0,
                            max_tokens: 4000
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI API timeout')), 35000))
                    ]);
                    
                    const fallbackText = fallbackResponse.choices?.[0]?.message?.content;
                    if (fallbackText) {
                        let cleaned = fallbackText.trim();
                        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
                        const parsed = JSON.parse(cleaned);
                        console.log('✅ Using fallback analysis without tools');
                        return parsed;
                    }
                } catch (fallbackErr) {
                    console.warn('⚠️ Fallback also failed:', fallbackErr?.message || fallbackErr);
                    throw err; // Throw original error
                }
            }
        }

        // If we reach here, neither method worked
        throw new Error('ChatGPT API analysis failed - all methods exhausted');
    } catch (error) {
        console.error("❌ Error in AI analysis internal:", error);
        throw error; // Re-throw to be handled by wrapper
    }
}

// Removed: All the complex page fetching, sitemap crawling, and fallback logic
// Now using only ChatGPT API web_search which is faster and more reliable

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
