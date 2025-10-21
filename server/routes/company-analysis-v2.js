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

    try {
        // Try OpenAI web_search tool first (SDK v4 Responses API)
        if (openai && openai.responses && typeof openai.responses.create === 'function') {
            console.log('🌐 Trying OpenAI web_search tool via Responses API');
            const systemPromptSearch = `אתה מנתח אתרי אינטרנט של חברות בניה/נדל"ן. בצע web_search וחפש אך ורק מידע מהדומיין הבא: ${websiteUrl}. אם המידע אינו מהדומיין הזה, אל תשתמש בו. החזר JSON בלבד.`;
            const userPromptSearch = `נתח את האתר ${websiteUrl} עם דגש על עמודי אודות/פרויקטים/בטיחות. החזר JSON עם {companyName, about (~1000 מילים), safety, projects (מערך), logoUrl (מאותו דומיין בלבד)}.`;

            try {
                const resp = await openai.responses.create({
                    model: 'gpt-4o-mini',
                    input: [
                        { role: 'system', content: systemPromptSearch },
                        { role: 'user', content: userPromptSearch }
                    ],
                    tools: [{ type: 'web_search' }],
                    temperature: 0.0,
                });

                // Attempt to unify content extraction from Responses API
                const responseText = resp?.output_text || resp?.content?.[0]?.text || resp?.choices?.[0]?.message?.content;
                if (responseText) {
                    let cleaned = responseText.trim();
                    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    const parsed = JSON.parse(cleaned);
                    // Sanitize logo to same domain
                    try {
                        const base = new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`);
                        const safe = parsed?.logoUrl ? new URL(parsed.logoUrl, base.origin).href : null;
                        parsed.logoUrl = safe && new URL(safe).origin === base.origin ? safe : null;
                    } catch (_) { }
                    console.log('✅ Using web_search-based analysis');
                    return parsed;
                }
            } catch (err) {
                console.warn('⚠️ web_search via Responses API failed, falling back to on-site crawl:', err?.message || err);
            }
        }

        // Normalize URL and prep helpers
        const normalizeUrl = (url) => {
            if (!url) return '';
            const hasProtocol = /^https?:\/\//i.test(url);
            return hasProtocol ? url : `https://${url}`;
        };
        const baseUrl = new URL(normalizeUrl(websiteUrl));
        const sameDomainOnly = (u) => {
            try { const x = new URL(u, baseUrl.origin); return x.origin === baseUrl.origin ? x.href : null; } catch { return null; }
        };

        // Fetch key pages from the site
        const fetch = require('node-fetch');
        const fetchPage = async (path) => {
            const target = new URL(path, baseUrl.origin).href;
            try {
                const res = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0 (ContractorCRM/1.0)' }, timeout: 15000 });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const html = await res.text();
                return { url: target, html };
            } catch (e) {
                console.warn('⚠️ Failed to fetch page', target, e.message);
                return { url: target, html: '' };
            }
        };

        const candidatePaths = ['/', '/about', '/en/about', '/he/about', '/אודות', '/company', '/projects', '/projects/', '/בטיחות', '/safety'];
        const uniquePaths = Array.from(new Set(candidatePaths));
        const pages = await Promise.all(uniquePaths.map(fetchPage));

        // Discover and prioritize nav links (About/Projects/Safety)
        try {
            const $ = cheerio.load(pages[0]?.html || '');
            const navLinks = [];
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href') || '';
                const text = ($(el).text() || '').toLowerCase();
                if (/about|אודות|projects|פרויקטים|safety|בטיחות/.test(text) || /about|אודות|projects|פרויקטים|safety|בטיחות/.test(href)) {
                    const abs = new URL(href, baseUrl.origin).href;
                    if (new URL(abs).origin === baseUrl.origin) navLinks.push(abs);
                }
            });
            for (const l of Array.from(new Set(navLinks))) {
                try {
                    const { html } = await fetchPage(l);
                    pages.push({ url: l, html });
                } catch (_) { }
            }
        } catch (_) { }

        const stripScriptsStyles = (html) => html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ');
        const stripTags = (html) => stripScriptsStyles(html)
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const pageTexts = pages
            .map(p => ({ url: p.url, text: stripTags(p.html).slice(0, 40000) }))
            .sort((a, b) => {
                const score = (u) => (/about|אודות/i.test(u) ? 100 : /projects|פרויקטים/i.test(u) ? 50 : /safety|בטיחות/i.test(u) ? 30 : 0);
                return score(b.url) - score(a.url);
            });

        // Extract logo candidates from homepage
        const homeHtml = pages.find(p => p.url === new URL('/', baseUrl.origin).href)?.html || pages[0]?.html || '';
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
        const logoHints = [];
        let m;
        while ((m = imgRegex.exec(homeHtml)) !== null) {
            const src = m[1];
            const abs = sameDomainOnly(src.startsWith('http') ? src : new URL(src, baseUrl.origin).href);
            if (!abs) continue;
            if (/logo|logotype|brand/i.test(src)) logoHints.push(abs);
        }
        const dedupedLogos = Array.from(new Set(logoHints)).slice(0, 5);

        // Build strict, context-only prompts
        const contextBlocks = pageTexts
            .filter(pt => pt.text)
            .map(pt => `URL: ${pt.url}\n---\n${pt.text}`)
            .join('\n\n====\n\n')
            .slice(0, 120000);

        const systemPrompt = `אתה מנתח אתרי חברות בניה/נדל"ן. הסתמך אך ורק על הטקסט שסופק בקונטקסט מן הדומיין הנתון. אם מידע חסר, השאר ריק. אין לנחש ואין להשתמש בידע חיצוני.`;
        const userPrompt = `קונטקסט מהאתר (ממויין כך שעמוד אודות בראש):\n\n${contextBlocks}\n\nרמזי לוגו מאותו דומיין בלבד:\n${dedupedLogos.join('\n') || 'ללא'}\n\nהחזר רק JSON תקין עם המפתחות: {"companyName":"","about":"","safety":"","projects":[],"logoUrl":""}.\nכללים:\n- companyName להשאיר ריק.\n- about: כ~1000 מילים, רק מן הקונטקסט שסופק; אין להוסיף מידע שלא מופיע.\n- safety: רק מן הקונטקסט.\n- projects: מערך שמות/תיאורים שמופיעים בקונטקסט בלבד.\n- logoUrl: מאותו דומיין בלבד.\n- אין טקסט נוסף מעבר ל-JSON.`;

        console.log("📝 Sending request to OpenAI... (", openaiClientVersion, ")");

        let aiResponse;
        if (openai && openai.chat && openai.chat.completions && typeof openai.chat.completions.create === 'function') {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
                temperature: 0.0,
                max_tokens: 4000
            });
            console.log("✅ Received response from OpenAI (v4)");
            aiResponse = response.choices?.[0]?.message?.content;
        } else if (openai && typeof openai.createChatCompletion === 'function') {
            const response = await openai.createChatCompletion({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
                temperature: 0.0,
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

        let cleanedResponse = aiResponse.trim();
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        console.log("🧹 Cleaned response:", cleanedResponse.slice(0, 500));

        const analysisResult = JSON.parse(cleanedResponse);

        // Enforce same-domain logo
        if (analysisResult && analysisResult.logoUrl) {
            const safe = sameDomainOnly(analysisResult.logoUrl);
            analysisResult.logoUrl = safe || (dedupedLogos[0] || null);
        } else if (dedupedLogos.length > 0) {
            analysisResult.logoUrl = dedupedLogos[0];
        }

        console.log("✅ Successfully parsed AI response (sanitized):", {
            aboutLength: analysisResult?.about?.length || 0,
            projectsCount: Array.isArray(analysisResult?.projects) ? analysisResult.projects.length : 0,
            logo: analysisResult?.logoUrl || null
        });

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

        // Block analysis when contractor name and detected site brand mismatch badly
        try {
            const dbCompanyName = (req.body?.dbCompanyName || '').toString();
            const detectedDomainName = (new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`)).hostname;
            if (dbCompanyName) {
                const simplify = (s) => (s || '').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').trim();
                const a = simplify(dbCompanyName);
                const b = simplify(detectedDomainName.replace(/\.(co|com|org|net|il)\.?[a-z]*$/i, ''));
                const levenshtein = (s1, s2) => {
                    const n = s1.length, m = s2.length;
                    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
                    for (let i = 0; i <= n; i++) dp[i][0] = i;
                    for (let j = 0; j <= m; j++) dp[0][j] = j;
                    for (let i = 1; i <= n; i++) {
                        for (let j = 1; j <= m; j++) {
                            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
                        }
                    }
                    return dp[n][m];
                };
                const maxLen = Math.max(a.length, b.length) || 1;
                const sim = 1 - (levenshtein(a, b) / maxLen);
                console.log('🔎 Pre-check name similarity (server):', { dbCompanyName, detectedDomainName, sim });
                if (sim < 0.5) {
                    return res.status(412).json({
                        success: false,
                        error: 'Company name and website domain appear to mismatch. Please verify the website URL.',
                        similarity: sim
                    });
                }
            }
        } catch (e) {
            console.warn('⚠️ Pre-check name similarity failed:', e?.message || e);
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
