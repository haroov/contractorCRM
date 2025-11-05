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
    const combined = texts.join('\n\n-----------------------------\n\n').slice(0, 70000);
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

async function searchGoogleForLogo(hostname) {
    try {
        console.log('🔍 Searching Google Images for logo:', hostname);
        const baseHost = hostname.replace(/^www\./, '');

        // Try multiple search queries
        const searchQueries = [
            `site:${hostname} logo`,
            `${baseHost} logo`,
            `logo ${baseHost}`
        ];

        for (const searchQuery of searchQueries) {
            try {
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;

                const response = await fetch(searchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5'
                    },
                    timeout: 10000
                });

                if (!response.ok) {
                    console.warn(`⚠️ Google Images search failed for "${searchQuery}":`, response.status);
                    continue;
                }

                const html = await response.text();
                console.log(`📄 Google Images HTML length for "${searchQuery}":`, html.length);

                // Try multiple patterns to extract first image URL
                const patterns = [
                    // Google Images JSON structure (most reliable)
                    /\["(https?:\/\/[^"]+\.(?:png|svg|jpg|jpeg|webp|ico))"/gi,
                    // Google Images ou field
                    /"ou":"(https?:\/\/[^"]+\.(?:png|svg|jpg|jpeg|webp|ico))"/gi,
                    // Direct img src
                    /<img[^>]+src="(https?:\/\/[^"]+\.(?:png|svg|jpg|jpeg|webp|ico))"/gi,
                    // Any image URL containing logo
                    /"(https?:\/\/[^"]*logo[^"]*\.(?:png|svg|jpg|jpeg|webp|ico))"/gi,
                    // Base64 encoded images (less common)
                    /<img[^>]+data-src="(https?:\/\/[^"]+\.(?:png|svg|jpg|jpeg|webp|ico))"/gi
                ];

                for (const pattern of patterns) {
                    const matches = Array.from(html.matchAll(pattern));
                    for (const match of matches) {
                        if (match[1]) {
                            let imgUrl = match[1];
                            // Skip data URLs
                            if (imgUrl.startsWith('data:')) continue;
                            // Skip very small images (likely icons) unless explicitly logo
                            if (imgUrl.includes('/favicon') && !imgUrl.includes('logo')) continue;
                            // Prefer URLs containing "logo" or from the same domain
                            const isLogoUrl = imgUrl.includes('logo') || imgUrl.includes(baseHost);
                            if (isLogoUrl || matches.indexOf(match) < 3) {
                                console.log('✅ Found logo URL via Google Images:', imgUrl);
                                return imgUrl;
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn(`⚠️ Error searching Google Images with query "${searchQuery}":`, e.message);
                continue;
            }
        }

        console.log('❌ No logo found in Google Images search results');
        return null;
    } catch (error) {
        console.warn('⚠️ Google Images logo search failed:', error.message);
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

// Google S2 favicon service (almost always returns an icon for the domain)
async function tryGoogleS2Favicon(hostname) {
    const base = hostname.replace(/^www\./, '');
    const url = `https://www.google.com/s2/favicons?domain=${base}&sz=256`;
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
    url = await searchGoogleForLogo(hostname);
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
    // 6) Google S2 favicon (final fallback)
    url = await tryGoogleS2Favicon(hostname);
    if (url) {
        console.log('✅ Using Google S2 favicon as logo:', url);
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

// Use OpenAI Chat Completions API with gpt-4o-search-preview and web_search tool
async function callChatGPTWithWebSearch({ domain, hostname, displayName, maxTokens = 40000 }) {
    if (!OPENAI_API_KEY) {
        throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    const systemPrompt = `אתה כותב תוכן מומחה בעברית לעמוד "אודות" של חברות בניה ונדל"ן בישראל.
השתמש ב-web_search כדי לאסוף מידע מקיף על החברה.
כתוב טקסט מקיף, ארוך מאוד מאוד ומפורט - לפחות 3000 מילים, ועדיף 3500-4000 מילים.
כלול בהרחבה: היסטוריה מפורטת מאוד של החברה מראשיתה, תחומי פעילות רחבים ומגוונים, פרויקטים בולטים עם פרטים ספציפיים מאוד, שנות ניסיון ותק עם דוגמאות, צוות מקצועי ומנוסה, טכנולוגיות מתקדמות בשימוש, שירותים מלאים ומגוונים, לקוחות ופרויקטים קודמים עם סיפורי הצלחה, תעודות והסמכות מקצועיות, חדשנות ופיתוח, אחריות חברתית וסביבתית, חזון ומטרות ארוכות טווח, שיטות עבודה ייחודיות, גישה ללקוח, ערכים ועקרונות, פרסים והכרות, שותפויות אסטרטגיות, התפתחות החברה לאורך השנים, אתגרים והצלחות, תרומה לקהילה.
חשוב מאוד מאוד: הטקסט חייב להיות ארוך מאוד מאוד - לפחות 3000 מילים! הרחב כל נושא מאוד מאוד, הוסף פרטים רבים, תאר באופן מעמיק ומפורט, כתוב פסקאות ארוכות מאוד.`;

    const userPrompt = `סכם את המידע המרכזי על החברה שמחזיקה בדומיין ${domain} (${displayName}).

כתוב טקסט "אודות החברה" ארוך מאוד מאוד, מפורט ומקיף מאוד (לפחות 3000 מילים, ועדיף 3500-4000 מילים).
כלול: רקע החברה, תחומי פעילות, חוזקות, סיכונים, דגש על ניהול ובטיחות (אם רלוונטי), היסטוריה מפורטת, פרויקטים בולטים, ניסיון, צוות, טכנולוגיות, שירותים, לקוחות, תעודות, חדשנות, אחריות חברתית, חזון.

בנוסף, מצא קישור ללוגו החברה (URL של קובץ תמונה) והחזר אותו בנפרד.

החזר תשובה בפורמט JSON:
{
  "about": "טקסט ארוך ומפורט מאוד...",
  "logo_url": "https://..."
}`;

    try {
        // Try gpt-4o-search-preview first, but fallback to regular model if not available
        const payload = {
            model: 'gpt-4o-search-preview',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            tools: [
                {
                    type: 'web_search',
                    query: domain,
                    size: 'large',
                    user_location: { country: 'IL' }
                }
            ],
            temperature: 0.2,
            max_tokens: maxTokens
        };

        console.log('🔍 Attempting ChatGPT web_search with model: gpt-4o-search-preview');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            const errData = JSON.parse(errText).error || {};
            console.error('❌ OpenAI API error:', {
                status: response.status,
                code: errData.code,
                message: errData.message,
                type: errData.type
            });

            // If model not found, try without web_search tool
            if (errData.code === 'model_not_found' || errData.message?.includes('gpt-4o-search-preview')) {
                console.warn('⚠️ gpt-4o-search-preview not available, will fallback to traditional method');
            }

            throw new Error(`OpenAI API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content || '';

        console.log(`📝 Raw reply from OpenAI: ${reply.length} characters`);
        console.log(`📝 First 1000 chars of reply: ${reply.substring(0, 1000)}`);
        console.log(`📝 Last 500 chars of reply: ${reply.substring(Math.max(0, reply.length - 500))}`);

        if (!reply) {
            throw new Error('No content from OpenAI');
        }

        // Try to parse JSON from reply
        try {
            // Extract JSON if wrapped in markdown code blocks
            let jsonStr = null;
            const markdownMatch = reply.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            if (markdownMatch) {
                jsonStr = markdownMatch[1];
            } else {
                // Try to find JSON object in the reply
                const jsonMatch = reply.match(/(\{[\s\S]*\})/);
                if (jsonMatch) {
                    jsonStr = jsonMatch[1];
                }
            }

            if (jsonStr) {
                console.log(`📋 Extracted JSON string length: ${jsonStr.length} characters`);
                // Try to parse, but handle potential issues with very long strings
                try {
                    const parsed = JSON.parse(jsonStr);
                    console.log(`✅ Successfully parsed JSON from reply. About length: ${parsed.about ? parsed.about.length : 0} chars`);
                    if (parsed.about) {
                        console.log(`📊 About text word count: ${getWordCount(parsed.about)} words`);
                        console.log(`📊 About text preview (first 300): ${parsed.about.substring(0, 300)}...`);
                        console.log(`📊 About text preview (last 300): ...${parsed.about.substring(Math.max(0, parsed.about.length - 300))}`);
                    }
                    return parsed;
                } catch (parseErr) {
                    console.warn('⚠️ JSON parse failed on extracted string, trying to fix...', parseErr.message);
                    console.warn('⚠️ Parse error at position:', parseErr.message.match(/position\s+(\d+)/)?.[1]);

                    // More aggressive JSON fixing for long texts with special characters
                    try {
                        // Find the "about" field and extract its value manually
                        const aboutMatch = jsonStr.match(/"about"\s*:\s*"((?:[^"\\]|\\.|\\n|\\r)*)"/);
                        if (aboutMatch) {
                            let aboutValue = aboutMatch[1];
                            // Unescape the value
                            aboutValue = aboutValue.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\\\/g, '\\');

                            // Find logo_url if present
                            const logoMatch = jsonStr.match(/"logo_url"\s*:\s*"([^"]+)"/);
                            const logoUrl = logoMatch ? logoMatch[1] : null;

                            console.log(`✅ Manually extracted about text: ${aboutValue.length} chars`);
                            return {
                                about: aboutValue,
                                logo_url: logoUrl
                            };
                        }
                    } catch (extractErr) {
                        console.warn('⚠️ Manual extraction also failed:', extractErr.message);
                    }

                    // Last resort: try to fix common JSON issues
                    try {
                        // Handle unescaped quotes and newlines in about field
                        let fixedJson = jsonStr.replace(/"about"\s*:\s*"([^"]*(?:\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})|[^"\\])*)"?/g, (match, content) => {
                            // Properly escape the content
                            const escaped = content
                                .replace(/\\/g, '\\\\')
                                .replace(/"/g, '\\"')
                                .replace(/\n/g, '\\n')
                                .replace(/\r/g, '\\r')
                                .replace(/\t/g, '\\t');
                            return `"about":"${escaped}"`;
                        });

                        const parsed = JSON.parse(fixedJson);
                        console.log(`✅ Successfully parsed fixed JSON. About length: ${parsed.about ? parsed.about.length : 0} chars`);
                        return parsed;
                    } catch (e) {
                        console.warn('⚠️ Fixed JSON also failed, will fall back to text extraction');
                        throw parseErr;
                    }
                }
            }

            // Try direct parse
            const parsed = JSON.parse(reply);
            console.log('✅ Successfully parsed JSON from reply (direct)');
            if (parsed.about) {
                console.log(`📊 About text length: ${parsed.about.length} chars, ${getWordCount(parsed.about)} words`);
            }
            return parsed;
        } catch (parseError) {
            // If not JSON, return the text as about
            console.warn('⚠️ Could not parse JSON from reply, using as plain text. Reply length:', reply.length);
            console.warn('⚠️ Parse error:', parseError.message);
            console.warn('⚠️ First 1000 chars of reply:', reply.substring(0, 1000));
            console.warn('⚠️ Last 500 chars of reply:', reply.substring(Math.max(0, reply.length - 500)));

            // Try to extract "about" and "logo_url" from text if present
            // Use a smarter approach that handles long texts with quotes

            let aboutText = '';

            // Strategy 1: Try to find JSON structure manually
            try {
                // Find "about": and extract everything until the next field or end
                const aboutStart = reply.search(/"about"\s*:\s*"/i);
                if (aboutStart !== -1) {
                    let startPos = aboutStart + reply.substring(aboutStart).indexOf('"') + 1;
                    let pos = startPos;
                    let depth = 0;
                    let escaped = false;

                    // Find the closing quote, handling escaped quotes
                    while (pos < reply.length) {
                        if (escaped) {
                            escaped = false;
                            pos++;
                            continue;
                        }
                        if (reply[pos] === '\\') {
                            escaped = true;
                            pos++;
                            continue;
                        }
                        if (reply[pos] === '"') {
                            // Found closing quote
                            aboutText = reply.substring(startPos, pos);
                            // Unescape the text
                            aboutText = aboutText
                                .replace(/\\"/g, '"')
                                .replace(/\\n/g, '\n')
                                .replace(/\\r/g, '\r')
                                .replace(/\\t/g, '\t')
                                .replace(/\\\\/g, '\\');
                            console.log(`📝 Extracted about text manually (strategy 1), length: ${aboutText.length} chars`);
                            break;
                        }
                        pos++;
                    }
                }
            } catch (e) {
                console.warn('⚠️ Manual extraction strategy 1 failed:', e.message);
            }

            // Strategy 2: Try regex patterns if manual extraction didn't work
            if (!aboutText || aboutText.length < 50) {
                const aboutPatterns = [
                    // Multi-line with escaped quotes: "about": "..." 
                    /"about"\s*:\s*"((?:[^"\\]|\\.)+)"/is,
                    // With single quotes
                    /'about'\s*:\s*'((?:[^'\\]|\\.)+)'/is,
                    // Without quotes but with colon
                    /about\s*:\s*["']([^"']{100,})["']/i,
                ];

                for (const pattern of aboutPatterns) {
                    const match = reply.match(pattern);
                    if (match && match[1]) {
                        aboutText = match[1].replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                        console.log(`📝 Extracted about text using regex pattern, length: ${aboutText.length} chars`);
                        if (aboutText.length >= 200) break; // Prefer longer matches
                    }
                }
            }

            // Strategy 3: If no structured match, but reply is long, use it as about text
            if (!aboutText || aboutText.length < 200) {
                // Check if the entire reply looks like it's about text (not JSON structure)
                if (reply.length > 200 && !reply.trim().startsWith('{') && !reply.trim().startsWith('[')) {
                    aboutText = reply.trim();
                    console.log(`📝 Using entire reply as about text, length: ${aboutText.length} chars`);
                }
            }

            const logoMatch = reply.match(/["']logo_url["']\s*:\s*["']([^"']+)["']/i) ||
                reply.match(/logo[":]\s*["']?([^"']+\.(?:png|svg|jpg|jpeg|webp))["']?/i);

            console.log(`✅ Returning extracted data. About length: ${aboutText.length} chars, ${getWordCount(aboutText)} words`);
            return {
                about: aboutText || (reply.length > 100 ? reply : ''),
                logo_url: logoMatch ? logoMatch[1] : null
            };
        }
    } catch (error) {
        console.error('❌ callChatGPTWithWebSearch failed:', error.message);
        throw error;
    }
}

function getWordCount(text) {
    if (!text) return 0;
    const words = String(text).trim().split(/\s+/g);
    return words.filter(Boolean).length;
}

// Generator for a rich "about" section - always ensures long, detailed text
async function generateRichAbout(collectedText, displayName, hostname) {
    const system = `אתה כותב תוכן מומחה בעברית לעמוד "אודות" של חברות בניה ונדל"ן בישראל.
המשימה שלך היא לכתוב טקסט מקיף, ארוך מאוד מאוד ומפורט - לפחות 3000 מילים, ועדיף 3500-4000 מילים.
הטקסט חייב להיות ארוך מאוד מאוד, מפורט מאוד, מקצועי ורהוט.
כלול בהרחבה: היסטוריה מפורטת מאוד של החברה מראשיתה, תחומי פעילות רחבים ומגוונים, פרויקטים בולטים עם פרטים ספציפיים מאוד, שנות ניסיון ותק עם דוגמאות, צוות מקצועי ומנוסה, טכנולוגיות מתקדמות בשימוש, שירותים מלאים ומגוונים, לקוחות ופרויקטים קודמים עם סיפורי הצלחה, תעודות והסמכות מקצועיות, חדשנות ופיתוח, אחריות חברתית וסביבתית, חזון ומטרות ארוכות טווח, שיטות עבודה ייחודיות, גישה ללקוח, ערכים ועקרונות, פרסים והכרות, שותפויות אסטרטגיות, התפתחות החברה לאורך השנים, אתגרים והצלחות, תרומה לקהילה.
חשוב מאוד מאוד: הטקסט חייב להיות ארוך מאוד - לפחות 3000 מילים! הרחב כל נושא מאוד מאוד, הוסף פרטים רבים, תאר באופן מעמיק ומפורט, כתוב פסקאות ארוכות מאוד.`;

    const user = `כתוב טקסט "אודות החברה" ארוך מאוד מאוד, מפורט ומקיף מאוד (לפחות 3000 מילים, ועדיף 3500-4000 מילים) עבור "${displayName}" (${hostname}).
השתמש רק במידע מטקסטים שנאספו מהאתר (WEB_RESULTS) - אל תמציא עובדות, אבל הרחב ותאר בצורה מאוד מפורטת את מה שיש.
אם יש מעט מידע, הרחב כל נקודה מאוד מאוד עם פרטים מפורטים רבים.
כלול כל מה שאפשר על: היסטוריה, תחומי פעילות, פרויקטים, ניסיון, צוות, טכנולוגיות, שירותים, לקוחות, תעודות, חדשנות, אחריות חברתית, חזון, שיטות עבודה, גישה ללקוח, ערכים, פרסים, שותפויות, התפתחות.
חשוב מאוד מאוד: הטקסט חייב להיות ארוך מאוד מאוד ומפורט - לפחות 3000 מילים! כתוב פסקאות ארוכות מאוד, הרחב כל נושא מאוד מאוד, תאר באופן מעמיק ומפורט מאוד מאוד. כל פסקה צריכה להיות ארוכה ומפורטת מאוד.

מידע שנאסף מהאתר:
"""
${(collectedText || '').slice(0, 70000)}
"""`;
    try {
        const about = await callOpenAIChatSimple({ systemPrompt: system, userPrompt: user, maxTokens: 40000 });
        return (about || '').trim();
    } catch (e) {
        console.warn('⚠️ generateRichAbout failed:', e.message);
        return '';
    }
}

async function enforceExactWordLength(baseText, targetWords, extraContext) {
    const system = `אתה עורך תוכן בעברית. כתוב או ערוך את הטקסט כך שיכיל בדיוק את מספר המילים המבוקש.
שמור על עובדות, בהירות וסגנון מקצועי. החזר טקסט בלבד, ללא כותרות, ללא רשימות וללא JSON.
חשוב מאוד: הטקסט חייב להכיל בדיוק ${targetWords} מילים! אם הטקסט קצר - הרחב אותו מאוד. אם הוא ארוך - צמצם אותו.
הרחב כל נושא, הוסף פרטים, תאר באופן מעמיק ומפורט.`;

    // Use more context for longer texts
    const contextLimit = targetWords >= 1500 ? 30000 : 15000;
    const user = `מספר מילים נדרש: ${targetWords} מילים בדיוק.

[טקסט קיים]
"""
${baseText || ''}
"""

[מידע נוסף מהאינטרנט להרחבה]
"""
${(extraContext || '').slice(0, contextLimit)}
"""

כתוב טקסט מפורט באורך ${targetWords} מילים בדיוק. אם הטקסט הקיים קצר, הרחב אותו מאוד עם המידע הנוסף. אם הוא ארוך, צמצם אותו.
התוצאה חייבת להכיל בדיוק ${targetWords} מילים. כתוב פסקאות ארוכות ומפורטות!`;

    const maxTokensForLength = Math.max(40000, targetWords * 14); // ~14 tokens per word (more for Hebrew)
    const rewritten = await callOpenAIChatSimple({ systemPrompt: system, userPrompt: user, maxTokens: maxTokensForLength });
    const final = rewritten.trim();
    const count = getWordCount(final);

    // If still not long enough, retry with even stronger instruction
    if (count < targetWords * 0.95) { // Allow only 5% tolerance, enforce if too short
        console.log(`⚠️ First rewrite: ${count} words (target: ${targetWords}), retrying with more context...`);
        const retryUser = `הטקסט הבא צריך להיות לפחות ${targetWords} מילים! אם הוא קצר - הרחב אותו מאוד מאוד. התוצאה חייבת להכיל לפחות ${targetWords} מילים!

טקסט נוכחי (${count} מילים - קצר מדי!):
"""
${final}
"""

מידע נוסף להרחבה:
"""
${(extraContext || '').slice(0, 50000)}
"""

כתוב טקסט ארוך מאוד מאוד ומפורט באורך לפחות ${targetWords} מילים! הרחב כל נושא מאוד מאוד, הוסף פרטים רבים מאוד, תאר באופן מעמיק ומפורט מאוד מאוד. כתוב פסקאות ארוכות מאוד, הרחב כל נקודה עם הרבה פרטים. הטקסט חייב להיות ארוך מאוד - לפחות ${targetWords} מילים!`;
        const retryResult = await callOpenAIChatSimple({ systemPrompt: system, userPrompt: retryUser, maxTokens: maxTokensForLength });
        const retryCount = getWordCount(retryResult.trim());
        console.log(`✅ After retry: ${retryCount} words (target: ${targetWords})`);

        // If still too short after retry, try one more time with even more aggressive approach
        if (retryCount < targetWords * 0.95) {
            console.log(`⚠️ Second rewrite still too short (${retryCount} words), attempting final aggressive expansion...`);
            const finalSystem = `אתה עורך תוכן בעברית. המשימה שלך היא להרחיב טקסט קיים לטקסט ארוך מאוד - לפחות ${targetWords} מילים.
            כתוב טקסט ארוך מאוד מאוד, מפורט מאוד מאוד, עם פסקאות ארוכות מאוד. הרחב כל נושא מאוד מאוד, הוסף הרבה פרטים, תאר באופן מעמיק מאוד מאוד.
            חשוב מאוד מאוד: הטקסט חייב להכיל לפחות ${targetWords} מילים!`;
            const finalUser = `הרחב את הטקסט הבא ל-${targetWords} מילים לפחות. הטקסט הנוכחי קצר מדי (${retryCount} מילים).
            
            טקסט קיים:
            """
            ${retryResult}
            """
            
            מידע נוסף להרחבה:
            """
            ${(extraContext || '').slice(0, 60000)}
            """
            
            כתוב טקסט ארוך מאוד מאוד (לפחות ${targetWords} מילים) על ידי הרחבה מאוד מפורטת של כל נושא. כתוב פסקאות ארוכות מאוד, הוסף פרטים רבים מאוד, תאר באופן מעמיק מאוד מאוד. הטקסט חייב להיות ארוך מאוד - לפחות ${targetWords} מילים!`;
            const finalResult = await callOpenAIChatSimple({ systemPrompt: finalSystem, userPrompt: finalUser, maxTokens: maxTokensForLength });
            const finalWordCount = getWordCount(finalResult.trim());
            console.log(`✅ After final aggressive expansion: ${finalWordCount} words (target: ${targetWords})`);
            return finalResult.trim();
        }

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

    // Always use the traditional method that generates rich content (skip web_search method that returns short content)
    console.log('🌐 Using traditional domain web search method for rich content:', hostname);
    let aboutText = '';
    let logoUrl = null;
    const TARGET_WORDS = 3000; // Target 3000 words for rich, comprehensive content

    // Use traditional method - this was the working version
    console.log('🌐 Performing domain web search and collection for:', hostname);
    const collectedText = await domainWebSearchCollectText(hostname, displayName);
    console.log(`📝 Collected text length: ${collectedText.length} characters`);

    try {
        // Generate rich about text using the traditional method
        aboutText = await generateRichAbout(collectedText, displayName, hostname);
        const wordCount = getWordCount(aboutText);
        console.log(`✅ Generated about text: ${aboutText.length} characters, ${wordCount} words`);

        // Always enforce minimum - even if generation succeeded
        if (wordCount < TARGET_WORDS || aboutText.length < 5000) {
            console.log(`⚠️ About text too short (${wordCount} words, ${aboutText.length} chars), enforcing ${TARGET_WORDS} words minimum...`);
            aboutText = await enforceExactWordLength(
                aboutText || `${displayName} היא חברה מובילה בתחום הבנייה והנדל"ן בישראל. החברה מתמחה בפרויקטים מגוונים בתחום הבנייה והנדל"ן.`,
                TARGET_WORDS,
                collectedText
            );
            const finalWordCount = getWordCount(aboutText);
            const finalLength = aboutText.length;
            console.log(`✅ After enforcement: ${finalLength} characters, ${finalWordCount} words`);
            if (finalWordCount < TARGET_WORDS * 0.9 || finalLength < 5000) {
                console.warn(`⚠️ WARNING: Final text still seems short (${finalWordCount} words, ${finalLength} chars). Retrying with more aggressive expansion...`);
                // Retry one more time with even more aggressive expansion
                aboutText = await enforceExactWordLength(
                    aboutText,
                    TARGET_WORDS,
                    collectedText
                );
                const retryWordCount = getWordCount(aboutText);
                const retryLength = aboutText.length;
                console.log(`✅ After retry: ${retryLength} characters, ${retryWordCount} words`);
            }
        }

        // Ensure we always have some text
        if (!aboutText || aboutText.trim().length === 0) {
            console.error('❌ About text is empty after all attempts, using minimal fallback');
            aboutText = `${displayName} היא חברה פעילה בתחום הבנייה והנדל"ן בישראל.`;
        }
    } catch (fallbackError) {
        console.error('❌ Generation failed:', fallbackError.message);
        console.error('❌ Error details:', fallbackError);
        // Last resort: minimal text
        aboutText = `${displayName} היא חברה פעילה בתחום הבנייה והנדל"ן בישראל.`;
    }

    // Final check - ensure aboutText is never empty
    if (!aboutText || aboutText.trim().length === 0) {
        console.error('❌ CRITICAL: About text is empty after all processing! Using emergency fallback.');
        aboutText = `${displayName} היא חברה פעילה בתחום הבנייה והנדל"ן בישראל.`;
    }

    // Search for logo
    if (!logoUrl) {
        console.log('🔍 Searching for logo...');

        // First, try to find logo directly on the website (most reliable)
        const baseHost = hostname.replace(/^www\./, '');
        const baseUrl = `https://${baseHost}`;
        try {
            const homepageResponse = await fetch(baseUrl, {
                timeout: 8000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            if (homepageResponse.ok) {
                const html = await homepageResponse.text();
                // Look for logo in HTML - prioritize elements with "logo" in class/id/alt
                const logoPatterns = [
                    /<img[^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+\.(?:png|svg|jpg|jpeg|webp))["']/i,
                    /<img[^>]*src=["']([^"']*logo[^"']*\.(?:png|svg|jpg|jpeg|webp))["']/i,
                    /<img[^>]*src=["']([^"']*\/logo[^"']*\.(?:png|svg|jpg|jpeg|webp))["']/i
                ];
                for (const pattern of logoPatterns) {
                    const match = html.match(pattern);
                    if (match && match[1]) {
                        let imgUrl = match[1];
                        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
                        else if (imgUrl.startsWith('/')) imgUrl = baseUrl + imgUrl;
                        else if (!imgUrl.startsWith('http')) imgUrl = baseUrl + '/' + imgUrl;
                        console.log('✅ Found logo on homepage:', imgUrl);
                        logoUrl = imgUrl;
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Could not search homepage for logo:', e.message);
        }

        // If not found on homepage, try Google Images
        if (!logoUrl) {
            logoUrl = await searchGoogleForLogo(hostname);
        }

        // Fallback chain if Google Images doesn't work
        if (!logoUrl) {
            logoUrl = await findLogoUrl(displayName, hostname);
        }

        // Final fallback: S2 favicon
        if (!logoUrl) {
            logoUrl = await tryGoogleS2Favicon(hostname);
            if (logoUrl) {
                console.log('✅ Using Google S2 favicon as logo:', logoUrl);
            }
        }
    }

    // Final validation - ensure aboutText is never empty, null, or undefined
    if (!aboutText || typeof aboutText !== 'string' || aboutText.trim().length === 0) {
        console.error('❌ CRITICAL: About text is still empty/null after all processing! Using comprehensive fallback.');
        // Generate a comprehensive fallback text
        aboutText = `${displayName} היא חברה מובילה ומוכרת בתחום הבנייה והנדל"ן בישראל. החברה מתמחה במגוון רחב של פרויקטים בתחומי הבנייה, החל מפרויקטים מגורים, מסחר, משרדים ועד פרויקטים גדולים ומורכבים. החברה מביאה עמה ניסיון רב שנים בתחום הבנייה והנדל"ן, עם צוות מקצועי ומנוסה המוביל פרויקטים רבים ומוצלחים ברחבי הארץ. החברה שמה דגש על איכות, מקצועיות ואחריות בכל פרויקט, תוך שמירה על תקנים גבוהים ועמידה בלוחות זמנים.`;

        // Try one more time to generate rich content if we have collected text
        try {
            const collectedText = await domainWebSearchCollectText(hostname, displayName);
            if (collectedText && collectedText.length > 100) {
                console.log('🔄 Attempting final emergency generation with collected text...');
                const emergencyAbout = await generateRichAbout(collectedText, displayName, hostname);
                if (emergencyAbout && emergencyAbout.trim().length > 500) {
                    aboutText = emergencyAbout;
                    console.log('✅ Emergency generation succeeded:', aboutText.length, 'chars');
                }
            }
        } catch (e) {
            console.warn('⚠️ Emergency generation failed, using basic fallback:', e.message);
        }
    }

    // Mark Google S2 favicon URLs so client knows to handle CORS differently
    const isGoogleFavicon = logoUrl && logoUrl.includes('google.com/s2/favicons');
    if (isGoogleFavicon) {
        console.log('⚠️ Logo is Google S2 favicon - client should handle CORS limitations');
    }

    // Build result object
    const result = {
        companyName: displayName,
        about: aboutText,
        safety: '', // Can be filled later if needed
        projects: '', // Can be filled later if needed
        logoUrl: logoUrl,
        _isGoogleFavicon: isGoogleFavicon // Flag for client-side handling
    };

    console.log('✅ Analysis result:', {
        companyName: result.companyName,
        aboutLength: result.about.length,
        aboutWords: getWordCount(result.about),
        hasLogo: !!result.logoUrl,
        isGoogleFavicon: isGoogleFavicon
    });
    console.log(`📋 Final about text preview (first 500 chars): ${result.about.substring(0, 500)}`);
    console.log(`📋 Final about text preview (last 200 chars): ${result.about.substring(Math.max(0, result.about.length - 200))}`);
    console.log(`📊 Full about text length check: ${result.about.length} characters, ${getWordCount(result.about)} words`);

    // Final validation before returning
    if (!result.about || result.about.trim().length === 0) {
        console.error('❌ FATAL: About text is still empty in final result!');
        result.about = `${displayName} היא חברה פעילה בתחום הבנייה והנדל"ן בישראל.`;
    }

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
