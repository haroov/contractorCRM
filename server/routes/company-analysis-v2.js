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

        // Try OpenAI chat completions with web_search tool (fallback method)
        if (openai && openai.chat && openai.chat.completions && typeof openai.chat.completions.create === 'function') {
            console.log('🌐 Trying OpenAI chat completions with web_search tool');
            const systemPromptSearch = `אתה מנתח אתרי אינטרנט של חברות בניה/נדל"ן. השתמש ב-web_search כדי לחפש מידע עדכני מהאתר. החזר JSON בלבד.`;
            const userPromptSearch = `נתח את האתר ${websiteUrl} עם דגש על עמודי אודות/פרויקטים/בטיחות. החזר JSON עם {companyName, about (~1000 מילים), safety, projects (מערך), logoUrl}.`;

            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPromptSearch },
                        { role: 'user', content: userPromptSearch }
                    ],
                    tools: [{ type: 'web_search' }],
                    temperature: 0.0,
                    max_tokens: 4000
                });

                const responseText = response.choices?.[0]?.message?.content;
                if (responseText) {
                    let cleaned = responseText.trim();
                    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    const parsed = JSON.parse(cleaned);
                    console.log('✅ Using web_search-based analysis via chat completions');
                    return parsed;
                }
            } catch (err) {
                console.warn('⚠️ web_search via chat completions failed, falling back to on-site crawl:', err?.message || err);
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

        // Heuristics to detect cookie/JS walls (Hebrew + common CMP providers)
        const looksLikeCookieOrJsWall = (html = '', status = 200) => {
            if (!html) return true;
            const text = html.toLowerCase();
            if (status >= 400 && status !== 404) return true;
            const enCookieWall = (
                /enable (the )?cookies|cookie settings|we (use|are using) cookies|cookie consent|accept all cookies|manage cookies/i.test(text)
            );
            const heCookieWall = (
                /קובצי\s*cookie|קבצי\s*cookie|קוקיז|עוגיות|אישור\s*קוקיז|אשר\s*קוקיז|מדיניות\s*הפרטיות|המשך\s*השימוש\s*באתר.*מסכים|הגדרות\s*cookie|יש לאפשר\s*cookie/i.test(text)
            );
            const jsRequired = /please enable javascript|javascript (is )?required|your browser.*javascript|נדרש\s*javascript|יש לאפשר\s*javascript/i.test(text);
            const cmpVendors = /onetrust|cookiebot|quantcast|trustarc|iubenda|consentmanager|didomi/i.test(text);
            const antiBot = /cloudflare|attention required!/i.test(text);
            const tooShort = text.replace(/<[^>]+>/g, '').length < 800;
            return enCookieWall || heCookieWall || jsRequired || cmpVendors || antiBot || tooShort;
        };

        // Fallback: fetch readable text via r.jina.ai proxy
        const fetchViaTextProxy = async (absUrl) => {
            try {
                const proxied = 'https://r.jina.ai/http://' + absUrl.replace(/^https?:\/\//i, '');
                const res = await fetch(proxied, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 ContractorCRM/1.0',
                        'Accept': 'text/plain,*/*;q=0.1',
                        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
                    },
                    timeout: 15000
                });
                if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
                const text = await res.text();
                return text || '';
            } catch (e) {
                console.warn('⚠️ Text proxy failed for', absUrl, e.message);
                return '';
            }
        };

        const fetchPage = async (path) => {
            const target = new URL(path, baseUrl.origin).href;
            try {
                const res = await fetch(target, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 ContractorCRM/1.0',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Referer': baseUrl.origin + '/',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    redirect: 'follow',
                    timeout: 20000
                });
                const status = res.status;
                const html = await res.text();
                if (!res.ok || looksLikeCookieOrJsWall(html, status)) {
                    console.warn('⚠️ Detected cookie/JS wall, retrying via text proxy:', target, status);
                    const text = await fetchViaTextProxy(target);
                    if (text) return { url: target, html: `<div>${text}</div>` };
                }
                return { url: target, html };
            } catch (e) {
                console.warn('⚠️ Failed to fetch page', target, e.message);
                const text = await fetchViaTextProxy(target);
                return { url: target, html: text ? `<div>${text}</div>` : '' };
            }
        };

        // Try to fetch sitemap and discover more relevant URLs (About/Projects)
        const fetchSitemapUrls = async () => {
            const sitemapCandidates = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml'];
            const discovered = [];
            for (const sm of sitemapCandidates) {
                try {
                    const abs = new URL(sm, baseUrl.origin).href;
                    const res = await fetch(abs, { headers: { 'User-Agent': 'Mozilla/5.0 ContractorCRM/1.0' }, timeout: 15000 });
                    if (!res.ok) continue;
                    const xml = await res.text();
                    const locMatches = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/gi)).map(m => m[1]).filter(Boolean);
                    for (const u of locMatches) {
                        try {
                            const same = new URL(u);
                            if (same.origin === baseUrl.origin) discovered.push(same.href);
                        } catch (_) { }
                    }
                } catch (_) { }
            }
            // Keep only pages likely to be relevant
            const relevant = discovered.filter(u => /about|אודות|company|projects|פרויקטים|safety|בטיחות|quality|איכות/i.test(u));
            return Array.from(new Set(relevant)).slice(0, 15);
        };

        const candidatePaths = [
            '/',
            // About variants
            '/about', '/about-us', '/company', '/company-profile', '/who-we-are',
            '/en/about', '/he/about', '/he/company', '/en/company',
            '/אודות', '/אודות-חברה', '/עלינו', '/פרופיל-חברה',
            // Projects variants
            '/projects', '/projects/', '/project', '/our-projects', '/portfolio', '/works',
            '/פרויקטים', '/הפרויקטים-שלנו', '/פרויקט',
            // Safety/quality variants
            '/safety', '/quality', '/iso', '/standards', '/בטיחות', '/איכות', '/תקן'
        ];
        const uniquePaths = Array.from(new Set(candidatePaths));
        let pages = await Promise.all(uniquePaths.map(fetchPage));

        // Also try sitemap-discovered pages
        try {
            const discovered = await fetchSitemapUrls();
            for (const u of discovered) {
                try { pages.push(await fetchPage(u)); } catch (_) { }
            }
        } catch (_) { }

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

        // If content seems sparse, try to re-fetch via proxy to enrich
        const ensureMinTextViaProxy = async (list) => {
            const enriched = [];
            for (const p of list) {
                const textLen = stripTags(p.html).length;
                if (textLen < 600) {
                    const proxiedText = await fetchViaTextProxy(p.url);
                    if (proxiedText && proxiedText.length > textLen) {
                        enriched.push({ url: p.url, html: `<div>${proxiedText}</div>` });
                        continue;
                    }
                }
                enriched.push(p);
            }
            return enriched;
        };

        let pageTexts = (await ensureMinTextViaProxy(pages))
            .map(p => ({ url: p.url, text: stripTags(p.html).slice(0, 40000) }))
            .sort((a, b) => {
                const score = (u) => (/about|אודות/i.test(u) ? 100 : /projects|פרויקטים/i.test(u) ? 50 : /safety|בטיחות/i.test(u) ? 30 : 0);
                return score(b.url) - score(a.url);
            });

        // If after enrichment the combined context is still too short, force proxy fetch for homepage and about
        const combinedLen = pageTexts.reduce((sum, pt) => sum + (pt.text?.length || 0), 0);
        if (combinedLen < 1500) {
            const forcePaths = ['/', '/about', '/אודות'];
            for (const fp of forcePaths) {
                const abs = new URL(fp, baseUrl.origin).href;
                const proxied = await fetchViaTextProxy(abs);
                if (proxied) {
                    pageTexts.unshift({ url: abs, text: stripTags(`<div>${proxied}</div>`).slice(0, 40000) });
                }
            }
            // Deduplicate by URL
            const seen = new Set();
            pageTexts = pageTexts.filter(pt => (seen.has(pt.url) ? false : (seen.add(pt.url), true)));
        }

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

        // Extract <title> and meta description from each page and prepend to its block
        const extractTitleDesc = (html) => {
            try {
                const $ = cheerio.load(html || '');
                const title = ($('title').first().text() || '').trim();
                const desc = ($('meta[name="description"]').attr('content') || '').trim();
                return { title, desc };
            } catch (_) { return { title: '', desc: '' }; }
        };

        // Build strict, context-only prompts
        const contextBlocks = pageTexts
            .filter(pt => pt.text)
            .map(pt => {
                const meta = extractTitleDesc(pages.find(p => p.url === pt.url)?.html || '');
                const header = [meta.title, meta.desc].filter(Boolean).join(' • ');
                return `URL: ${pt.url}\n${header ? `TITLE: ${header}\n` : ''}---\n${pt.text}`;
            })
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
