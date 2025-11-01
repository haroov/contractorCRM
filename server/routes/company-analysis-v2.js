const { Router } = require('express');
const fetch = require('node-fetch');

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

console.log('🚀 Loading company-analysis route (domain web-search version)');

// --- Web search helpers (DuckDuckGo HTML + r.jina.ai text proxy) ---
async function ddgSearch(query, limit = 5) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
        },
        timeout: 10000
    });
    if (!res.ok) return [];
    const html = await res.text();
    const urls = new Set();
    // Extract result links (DDG html uses 
    // <a class="result__a" href="https://duckduckgo.com/l/?uddg=ENCODED_URL&rut=...">
    const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"/ig;
    let m;
    while ((m = linkRegex.exec(html)) && urls.size < limit * 2) {
        const href = m[1];
        try {
            const u = new URL(href, 'https://duckduckgo.com');
            const forwarded = u.searchParams.get('uddg');
            if (forwarded) {
                const decoded = decodeURIComponent(forwarded);
                urls.add(decoded);
            } else if (href.startsWith('http')) {
                urls.add(href);
            }
        } catch (_) { /* ignore */ }
    }
    return Array.from(urls).slice(0, limit);
}

function sameDomain(urlString, baseHost) {
    try {
        const u = new URL(urlString);
        const h = u.hostname.replace(/^www\./, '');
        const b = baseHost.replace(/^www\./, '');
        return h === b || h.endsWith(`.${b}`);
    } catch (_) { return false; }
}

async function fetchReadableText(targetUrl) {
    try {
        const proxied = `https://r.jina.ai/http://${targetUrl.replace(/^https?:\/\//, '')}`;
        const r = await fetch(proxied, { headers: { 'User-Agent': 'ContractorCRM/1.0' }, timeout: 12000 });
        if (!r.ok) return '';
        const t = await r.text();
        return t || '';
    } catch (_) { return ''; }
}

async function domainWebSearchCollectText(hostname, companyName) {
    const baseHost = hostname.replace(/^www\./, '');
    const queries = [
        `site:${baseHost} אודות`,
        `site:${baseHost} about`,
        `site:${baseHost} פרויקטים`,
        `site:${baseHost} projects`,
        `site:${baseHost} בטיחות`,
        `site:${baseHost} תקנים`,
        `site:${baseHost} ISO`,
        `${companyName || baseHost} חברה בניה`,
    ];
    const foundUrls = new Set();
    for (const q of queries) {
        const links = await ddgSearch(q, 5);
        for (const l of links) {
            if (sameDomain(l, baseHost)) foundUrls.add(l);
        }
        if (foundUrls.size >= 8) break;
    }
    // Always include homepage
    foundUrls.add(`https://${baseHost}`);

    const texts = [];
    for (const url of Array.from(foundUrls).slice(0, 12)) {
        const text = await fetchReadableText(url);
        if (text && text.length > 300) {
            texts.push(`URL: ${url}\n\n${text}`);
        }
    }
    // Increase limit to allow more context for rich about text
    const combined = texts.join('\n\n-----------------------------\n\n').slice(0, 50000);
    return combined;
}

async function tryClearbit(hostname) {
    try {
        const url = `https://logo.clearbit.com/${hostname.replace(/^www\./, '')}`;
        const r = await fetch(url, { timeout: 8000 });
        if (r.ok) return url; // clearbit serves the image directly
    } catch (_) { }
    return null;
}

async function searchGoogleForLogo(companyName, website) {
    try {
        console.log('🔍 Searching Google for logo:', companyName, website);
        const searchQueries = [
            `${companyName} logo site:${website}`,
            `${companyName} logo`,
            `logo ${companyName} ${website}`
        ];
        
        for (const searchQuery of searchQueries) {
            try {
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;

                const response = await fetch(searchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 10000
                });

                if (!response.ok) continue;

                const html = await response.text();

                // Extract image URLs from Google Images results - try multiple patterns
                const patterns = [
                    /<img[^>]+src="([^"]+)"[^>]*>/gi,
                    /"ou":"([^"]+\.(?:png|svg|jpg|jpeg|webp))"/gi,
                    /\["(https?:\/\/[^"]+\.(?:png|svg|jpg|jpeg|webp))"/gi
                ];
                
                for (const pattern of patterns) {
                    const matches = html.matchAll(pattern);
                    for (const match of matches) {
                        if (match[1]) {
                            let imgUrl = match[1];
                            // Skip data URLs and Google internal URLs
                            if (imgUrl.startsWith('data:') || imgUrl.includes('googleusercontent.com') || imgUrl.includes('/images?q=')) {
                                continue;
                            }
                            // Clean up Google's proxied URLs
                            if (imgUrl.startsWith('/images?q=')) {
                                imgUrl = 'https://www.google.com' + imgUrl;
                            }
                            
                            // Verify the image is accessible
                            try {
                                const testResponse = await fetch(imgUrl, { method: 'HEAD', timeout: 5000 });
                                if (testResponse.ok) {
                                    const contentType = testResponse.headers.get('content-type');
                                    if (contentType && contentType.startsWith('image/')) {
                                        console.log('✅ Found logo URL via Google:', imgUrl);
                                        return imgUrl;
                                    }
                                }
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                }
            } catch (e) {
                continue;
            }
        }

        console.log('❌ No logo found in Google search results');
        return null;
    } catch (error) {
        console.warn('⚠️ Google logo search failed:', error.message);
        return null;
    }
}

async function tryFavicon(hostname) {
    const url = `https://${hostname.replace(/^www\./, '')}/favicon.ico`;
    try {
        const r = await fetch(url, { timeout: 8000 });
        if (r.ok) return url;
    } catch (_) { }
    return null;
}

async function findLogoUrl(companyName, hostname) {
    const baseHost = hostname.replace(/^www\./, '');
    const baseUrl = `https://${baseHost}`;
    
    // 1) Try common logo paths on the site
    const commonPaths = [
        '/logo.png', '/logo.svg', '/logo.jpg', '/logo.jpeg',
        '/images/logo.png', '/images/logo.svg', '/images/logo.jpg',
        '/wp-content/uploads/logo.png', '/wp-content/uploads/logo.svg',
        '/assets/logo.png', '/assets/logo.svg', '/assets/images/logo.png',
        '/static/logo.png', '/static/logo.svg', '/img/logo.png',
        '/public/logo.png', '/public/logo.svg', '/uploads/logo.png',
        '/_next/static/logo.png', '/logo.webp', '/images/logo.webp'
    ];
    
    console.log('🔍 Searching for logo on:', baseUrl);
    for (const path of commonPaths) {
        try {
            const testUrl = `${baseUrl}${path}`;
            const r = await fetch(testUrl, { 
                timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            if (r.ok) {
                const contentType = r.headers.get('content-type');
                if (contentType && contentType.startsWith('image/')) {
                    console.log('✅ Found logo at:', testUrl);
                    return testUrl;
                }
            }
        } catch (e) {
            // Continue to next path
        }
    }
    
    // 2) Try to find logo in HTML of homepage
    try {
        const homepageResponse = await fetch(baseUrl, { 
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (homepageResponse.ok) {
            const html = await homepageResponse.text();
            // Look for common logo patterns in HTML
            const logoPatterns = [
                /<img[^>]+src=["']([^"']*logo[^"']*\.(?:png|svg|jpg|jpeg|webp))["']/i,
                /<img[^>]+src=["']([^"']*\/logo[^"']*\.(?:png|svg|jpg|jpeg|webp))["']/i,
                /logo["'][^>]*src=["']([^"']+)["']/i,
                /<img[^>]+alt=["']logo["'][^>]+src=["']([^"']+)["']/i
            ];
            for (const pattern of logoPatterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    let logoUrl = match[1];
                    // Handle relative URLs
                    if (logoUrl.startsWith('//')) {
                        logoUrl = 'https:' + logoUrl;
                    } else if (logoUrl.startsWith('/')) {
                        logoUrl = baseUrl + logoUrl;
                    } else if (!logoUrl.startsWith('http')) {
                        logoUrl = baseUrl + '/' + logoUrl;
                    }
                    try {
                        const logoResponse = await fetch(logoUrl, { 
                            method: 'HEAD',
                            timeout: 5000 
                        });
                        if (logoResponse.ok) {
                            console.log('✅ Found logo in HTML:', logoUrl);
                            return logoUrl;
                        }
                    } catch (e) {
                        // Continue searching
                    }
                }
            }
        }
    } catch (e) {
        console.log('⚠️ Could not parse homepage HTML for logo:', e.message);
    }
    
    // 3) Clearbit
    let url = await tryClearbit(hostname);
    if (url) {
        console.log('✅ Found logo via Clearbit:', url);
        return url;
    }
    
    // 4) Google Images
    url = await searchGoogleForLogo(companyName, hostname);
    if (url) {
        console.log('✅ Found logo via Google Images:', url);
        return url;
    }
    
    // 5) Site favicon (as last resort)
    url = await tryFavicon(hostname);
    if (url) {
        console.log('✅ Using favicon as logo:', url);
        return url;
    }
    
    console.log('❌ No logo found for:', hostname);
    return null;
}

async function checkNameMatchWithAI(dbName, aiName) {
    if (!dbName || !aiName) return false;
    if (!OPENAI_API_KEY) return false;
    try {
        const system = 'אתה עוזר שבודק אם שני שמות חברות מתייחסים לאותה חברה. החזר רק "כן" או "לא".';
        const user = `שם 1: "${dbName}"
שם 2: "${aiName}"

האם שני השמות מתייחסים לאותה חברה? לדוגמה: "קבוצת תדהר" כוללת "תדהר בניה בע"מ", "יונילבר" כוללת "יונילבר ישראל בע"מ". החזר רק "כן" או "לא".`;
        const response = await callOpenAIChatSimple({ systemPrompt: system, userPrompt: user });
        const answer = response.trim().toLowerCase();
        return answer.includes('כן') || answer.includes('yes');
    } catch (e) {
        console.warn('⚠️ AI name match check failed:', e.message);
        return false;
    }
}

async function callOpenAIChatSimple({ systemPrompt, userPrompt, maxTokens = 8000 }) {
    if (!OPENAI_API_KEY) {
        throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    const payload = {
        model: OPENAI_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: maxTokens
    };
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
        const message = data?.error?.message || `OpenAI API error (${response.status})`;
        throw new Error(message);
    }
    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('OpenAI API returned empty content');
    return text;
}

function getWordCount(text) {
    if (!text) return 0;
    const words = String(text).trim().split(/\s+/g);
    return words.filter(Boolean).length;
}

async function enforceExactWordLength(baseText, targetWords, extraContext) {
    const system = 'אתה עורך תוכן בעברית. כתוב או ערוך את הטקסט כך שיכיל בדיוק את מספר המילים המבוקש. שמור על עובדות, בהירות וסגנון מקצועי. החזר טקסט בלבד, ללא כותרות, ללא רשימות וללא JSON. חשוב מאוד: הטקסט חייב להכיל בדיוק ' + targetWords + ' מילים!';
    const user = `מספר מילים נדרש: ${targetWords} מילים בדיוק.

[טקסט קיים]
"""
${baseText || ''}
"""

[מידע נוסף מהאינטרנט להרחבה]
"""
${(extraContext || '').slice(0, 8000)}
"""

כתוב טקסט מפורט באורך ${targetWords} מילים בדיוק. אם הטקסט הקיים קצר, הרחב אותו עם המידע הנוסף. אם הוא ארוך, צמצם אותו. התוצאה חייבת להכיל בדיוק ${targetWords} מילים.`;
    const rewritten = await callOpenAIChatSimple({ systemPrompt: system, userPrompt: user, maxTokens: 12000 });
    const final = rewritten.trim();
    const count = getWordCount(final);
    // If still not exact, retry once more with stronger instruction
    if (count !== targetWords && count > 0) {
        console.log(`⚠️ First rewrite: ${count} words (target: ${targetWords}), retrying...`);
        const retryUser = `הטקסט הבא צריך להיות בדיוק ${targetWords} מילים. אם הוא קצר - הרחב אותו. אם הוא ארוך - קוצר אותו. התוצאה חייבת להכיל בדיוק ${targetWords} מילים, לא פחות ולא יותר!

טקסט נוכחי (${count} מילים):
"""
${final}
"""

מידע נוסף להרחבה (אם צריך):
"""
${(extraContext || '').slice(0, 4000)}
"""

כתוב טקסט באורך ${targetWords} מילים בדיוק!`;
        const retryResult = await callOpenAIChatSimple({ systemPrompt: system, userPrompt: retryUser, maxTokens: 12000 });
        return retryResult.trim();
    }
    return final;
}

async function enforceRangeWordLength(baseText, minWords, maxWords, preferred, extraContext) {
    const count = getWordCount(baseText);
    if (count >= minWords && count <= maxWords) return baseText;
    const target = preferred || Math.round((minWords + maxWords) / 2);
    return await enforceExactWordLength(baseText, target, extraContext);
}

function normalizeProjects(projectsValue) {
    if (Array.isArray(projectsValue)) {
        return projectsValue
            .map((item) => {
                if (typeof item === 'string') return item.trim();
                if (item && typeof item === 'object') {
                    const name = item.name || item.title || item.project || '';
                    const desc = item.description || item.details || '';
                    return [name, desc].filter(Boolean).join(' – ');
                }
                return String(item || '').trim();
            })
            .filter(Boolean)
            .join('\n');
    }
    if (typeof projectsValue === 'string') {
        return projectsValue.trim();
    }
    return '';
}

async function analyzeCompanyWebsite(websiteUrl, companyName) {
    console.log('🔍 Starting company analysis for:', websiteUrl, 'name hint:', companyName || '(none provided)');

    const normalizedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    const { hostname } = new URL(normalizedUrl);
    const displayName = (companyName || '').trim() || hostname;

    // 1) Perform domain-focused web search and collect readable text
    console.log('🌐 Performing domain web search and collection for:', hostname);
    const collectedText = await domainWebSearchCollectText(hostname, displayName);

    // 2) Ask OpenAI to produce the structured JSON based on the collected text
    const systemPrompt = `אתה אנליסט מומחה בחברות בניה ונדל"ן בישראל.
התבסס אך ורק על תוצאות החיפוש והטקסטים המצורפים (WEB_RESULTS) כדי להפיק תקציר מקיף, עשיר ומפורט בעברית.
התמקד במיוחד במידע על בטיחות, הסמכות, תקנים ופרויקטים.

חשוב מאוד: הטקסט "about" חייב להיות ארוך מאוד, מפורט ועשיר. המטרה היא לפחות 2000-3000 מילים או יותר!
כלול את כל המידע הרלוונטי מהאתר בפירוט מלא:
- היסטוריה מלאה של החברה (שנה, מייסדים, צמיחה)
- תחומי פעילות מפורטים (סוגי פרויקטים, אזורים, שירותים)
- ניסיון והישגים (שנים בענף, מספר פרויקטים, לקוחות)
- ערכים וחזון החברה
- פרויקטים בולטים עם תיאורים מפורטים (מיקומים, גדלים, תאריכים)
- צוות מקצועי (ניסיון, מומחיות)
- טכנולוגיות ושיטות בניה מתקדמות
- שירותים שמציעה החברה
- לקוחות בולטים ושותפויות
- תעודות, הסמכות, פרסים והכרות
- חדשנות ופיתוחים
- אחריות חברתית וסביבתית
- כל פרט רלוונטי אחר מהאתר

הטקסט חייב להיות ארוך, מפורט ומקיף - לפחות 2000-3000 מילים!
כתוב "safety" באורך 500-700 מילים.`;

    const userPrompt = `חברה: "${displayName}" (${hostname}).
החזר JSON תקין בלבד במבנה הבא:
{
  "companyName": "שם החברה המדויק",
  "about": "תיאור מפורט, ארוך מאוד ועשיר של החברה. הטקסט חייב להיות באורך של לפחות 2000-3000 מילים או יותר! כלול את כל המידע מהאתר בפירוט: היסטוריה מלאה, תחומי פעילות, ניסיון, ערכים, חזון, פרויקטים בולטים עם תיאורים, צוות, טכנולוגיות, שירותים, לקוחות, הישגים, תעודות, פרסים, שותפויות, חדשנות, אחריות חברתית וכל מידע נוסף רלוונטי. הטקסט צריך להיות ארוך מאוד ומפורט ככל האפשר - לפחות 2000-3000 מילים!",
  "safety": "מידע מפורט על בטיחות, הסמכות, תקנים, תעודות איכות, מדיניות בטיחות ונהלים (500-700 מילים)",
  "projects": ["פרויקט 1 עם תיאור מפורט", "פרויקט 2 עם תיאור מפורט", "פרויקט 3 עם תיאור מפורט"],
  "logoUrl": null
}

WEB_RESULTS (סיכומי דפי האתר והקישורים הרלוונטיים - השתמש בכל המידע הזה כדי ליצור טקסט ארוך ומפורט):
"""
${collectedText}
"""

חשוב: הטקסט "about" חייב להיות ארוך מאוד - לפחות 2000-3000 מילים! השתמש בכל המידע הזמין כדי ליצור טקסט מקיף ומפורט.`;

    const rawResponse = await callOpenAIChatSimple({ systemPrompt, userPrompt, maxTokens: 32000 });

    console.log('📄 Raw OpenAI response (first 500 chars):', rawResponse.slice(0, 500));

    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (err) {
        console.error('❌ Failed to parse JSON from OpenAI response:', err.message);
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            parsed = JSON.parse(match[0]);
        } else {
            throw err;
        }
    }

    // Always search for logo to ensure we find it - try multiple times if needed
    let logoUrl = parsed?.logoUrl || null;
    let logoSearchAttempts = 0;
    const maxLogoAttempts = 3;
    
    while (!logoUrl && logoSearchAttempts < maxLogoAttempts) {
        if (logoSearchAttempts === 0 && parsed?.logoUrl) {
            // First, verify the logo URL from AI response
            try {
                const testResponse = await fetch(parsed.logoUrl, { method: 'HEAD', timeout: 5000 });
                if (testResponse.ok) {
                    const contentType = testResponse.headers.get('content-type');
                    if (contentType && contentType.startsWith('image/')) {
                        console.log('✅ Using logo URL from AI response:', parsed.logoUrl);
                        logoUrl = parsed.logoUrl;
                        break;
                    }
                }
            } catch (e) {
                console.log('⚠️ Logo URL from AI is not accessible:', e.message);
            }
        }
        
        logoSearchAttempts++;
        console.log(`🔍 Searching for logo (attempt ${logoSearchAttempts}/${maxLogoAttempts})...`);
        logoUrl = await findLogoUrl(displayName, hostname);
        
        if (logoUrl) {
            console.log('✅ Logo found:', logoUrl);
            break;
        }
    }
    
    if (!logoUrl) {
        console.warn('⚠️ Could not find logo after', maxLogoAttempts, 'attempts');
    }

    // Use the about text as-is without word count enforcement - allow it to be as long and rich as possible
    let aboutText = parsed?.about || '';
    console.log(`ℹ️ about text length: ${aboutText.length} characters, ${getWordCount(aboutText)} words`);

    // Enforce safety length to 500–700 words (target ~600)
    let safetyText = parsed?.safety || '';
    try {
        safetyText = await enforceRangeWordLength(safetyText, 500, 700, 600, collectedText);
    } catch (e) {
        console.warn('⚠️ Failed to enforce safety length, keeping original safety:', e.message);
    }

    const result = {
        companyName: parsed?.companyName || displayName,
        about: aboutText,
        safety: safetyText,
        projects: normalizeProjects(parsed?.projects),
        logoUrl: logoUrl
    };

    console.log('✅ Parsed analysis result:', result);
    return result;
}

router.post('/analyze-company', async (req, res) => {
    console.log('🎯 POST /analyze-company invoked with body:', req.body);
    try {
        const { website, companyName } = req.body || {};

        if (!website) {
            return res.status(400).json({ success: false, error: 'Website URL is required' });
        }

        if (!OPENAI_API_KEY) {
            return res.status(500).json({ success: false, error: 'OPENAI_API_KEY is not configured on the server' });
        }

        const analysisResult = await analyzeCompanyWebsite(website, companyName);

        res.json({ success: true, data: analysisResult });
    } catch (error) {
        console.error('❌ analyze-company failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to analyze company website'
        });
    }
});

router.post('/check-name-match', async (req, res) => {
    try {
        const { dbName, aiName } = req.body || {};
        if (!dbName || !aiName) {
            return res.status(400).json({ success: false, error: 'Both dbName and aiName are required' });
        }
        const matches = await checkNameMatchWithAI(dbName, aiName);
        res.json({ success: true, matches });
    } catch (error) {
        console.error('❌ check-name-match failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check name match'
        });
    }
});

module.exports = router;
