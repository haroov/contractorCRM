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
        
        // Fetch website content first
        const fetch = require('node-fetch');
        const baseUrl = new URL(normalizedUrl);
        
        console.log('📥 Fetching content from website...');
        const fetchPage = async (path) => {
            const target = new URL(path, baseUrl.origin).href;
            try {
                const res = await fetch(target, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 8000
                });
                if (!res.ok) return '';
                return await res.text();
            } catch (e) {
                return '';
            }
        };
        
        const homeHtml = await fetchPage('/');
        let aboutHtml = await fetchPage('/about');
        if (!aboutHtml) aboutHtml = await fetchPage('/אודות');
        if (!aboutHtml) aboutHtml = '';
        
        // Extract text content
        const extractText = (html) => {
            if (!html) return '';
            const $ = cheerio.load(html);
            $('script, style, nav, footer, header').remove();
            return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);
        };
        
        let homeText = extractText(homeHtml);
        let aboutText = extractText(aboutHtml);
        
        // If content is too short (possible cookie wall), try proxy fallback
        if (!homeText || homeText.length < 500) {
            console.log('⚠️ Homepage content too short, trying text proxy...');
            try {
                const proxyUrl = `https://r.jina.ai/http://${baseUrl.host}${baseUrl.pathname}`;
                const proxyRes = await fetch(proxyUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 ContractorCRM/1.0' },
                    timeout: 10000
                });
                if (proxyRes.ok) {
                    const proxyText = await proxyRes.text();
                    homeText = proxyText.slice(0, 8000);
                    console.log('✅ Got content via proxy');
                }
            } catch (e) {
                console.warn('⚠️ Proxy also failed:', e.message);
            }
        }
        
        const combinedText = [homeText, aboutText].filter(Boolean).join('\n\n');
        
        if (!combinedText || combinedText.length < 100) {
            throw new Error('Failed to fetch meaningful content from website');
        }
        
        console.log(`✅ Fetched ${combinedText.length} characters from website`);
        
        const systemPrompt = `אתה מנתח אתרי חברות בניה/נדל"ן. הסתמך רק על הטקסט שסופק.`;
        const userPrompt = `נתח את החברה מהתוכן הבא ששוחזר מהאתר ${normalizedUrl}:

${combinedText}

חזור עם JSON בלבד:
{"companyName":"","about":"","safety":"","projects":[],"logoUrl":""}

כללים:
- companyName: שם החברה (אם נמצא)
- about: תיאור מפורט (~1000 מילים) על החברה מהתוכן
- safety: מידע על בטיחות/תקנים מהתוכן
- projects: מערך של פרויקטים מהתוכן
- logoUrl: null (לא מחפשים לוגו)`;

        // Use chat completions API to analyze the fetched content
        if (openai && openai.chat && openai.chat.completions && typeof openai.chat.completions.create === 'function') {
            console.log('🤖 Analyzing fetched content with ChatGPT API');
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
                    new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI API timeout')), 25000))
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
