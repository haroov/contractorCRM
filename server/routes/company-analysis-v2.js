const { Router } = require('express');
const fetch = require('node-fetch');

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

console.log('🚀 Loading company-analysis route (web-search version)');

async function callOpenAIChatWithWebSearch({ systemPrompt, userPrompt }) {
    if (!OPENAI_API_KEY) {
        throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    // Use the web_search tool via the correct API format
    const payload = {
        model: OPENAI_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        tools: [{ 
            type: 'web_search'
        }],
        temperature: 0.2,
        max_tokens: 8000
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

    if (!text) {
        throw new Error('OpenAI API returned empty content');
    }

    return text;
}

async function searchGoogleForLogo(companyName, website) {
    try {
        console.log('🔍 Searching Google for logo:', companyName, website);
        const searchQuery = `${companyName} logo site:${website}`;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;
        
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        
        if (!response.ok) {
            console.warn('⚠️ Google search failed:', response.status);
            return null;
        }
        
        const html = await response.text();
        
        // Extract first image URL from Google Images results
        const imgMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
        if (imgMatch && imgMatch[1]) {
            let imgUrl = imgMatch[1];
            // Clean up Google's proxied URLs
            if (imgUrl.startsWith('/images?q=')) {
                imgUrl = 'https://www.google.com' + imgUrl;
            }
            console.log('✅ Found logo URL:', imgUrl);
            return imgUrl;
        }
        
        console.log('❌ No logo found in Google search results');
        return null;
    } catch (error) {
        console.warn('⚠️ Google logo search failed:', error.message);
        return null;
    }
}

async function callOpenAIChatSimple({ systemPrompt, userPrompt }) {
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
        max_tokens: 8000
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

    const systemPrompt = `אתה אנליסט מומחה בחברות בניה ונדל"ן בישראל. 
חשוב מאוד: עליך להשתמש בכלי web_search כדי לחפש מידע עדכני ומפורט על החברה מהאתר ${hostname}.
אל תסתמך על הידע הקיים שלך - חפש מידע חדש ומעודכן מהאינטרנט.
התמקד במיוחד במידע על בטיחות, הסמכות, תקנים ופרויקטים.
כתוב תקציר מפורט באורך 1000 מילים בדיוק - לא פחות ולא יותר!`;

    const userPrompt = `אנא חפש מידע מפורט על החברה "${displayName}" (${hostname}) באמצעות web_search.
חפש מידע על:
1. שם החברה המדויק וההיסטוריה שלה
2. תיאור מפורט של החברה, תחומי הפעילות והניסיון
3. פרויקטים שביצעה או מבצעת (עם פרטים)
4. מידע מפורט על בטיחות, הסמכות, תקנים, תעודות איכות
5. מדיניות בטיחות, נהלים וסטנדרטים
6. לוגו החברה (אם קיים)

החזר את המידע בפורמט JSON הבא:
{
  "companyName": "שם החברה המדויק",
  "about": "תיאור מפורט של החברה באורך 1000 מילים בדיוק הכולל היסטוריה, תחומי פעילות, ניסיון, ערכים, חזון, פרויקטים בולטים, צוות מקצועי, טכנולוגיות מתקדמות, שירותים, לקוחות, הישגים ותעודות",
  "safety": "מידע מפורט על בטיחות, הסמכות, תקנים, תעודות איכות, מדיניות בטיחות ונהלים (500-700 מילים)",
  "projects": ["פרויקט 1 עם תיאור מפורט", "פרויקט 2 עם תיאור מפורט", "פרויקט 3 עם תיאור מפורט"],
  "logoUrl": "URL של הלוגו או null"
}

חשוב מאוד: 
- about צריך להיות בדיוק 1000 מילים - לא פחות ולא יותר!
- safety צריך להיות מפורט עם דגשי בטיחות ספציפיים (500-700 מילים)
- projects צריך לכלול תיאורים מפורטים
- החזר רק JSON תקין ללא טקסט נוסף
- אם אין מספיק מידע, הרחב את התיאור עם פרטים כלליים על החברה`;

    let rawResponse;
    try {
        rawResponse = await callOpenAIChatWithWebSearch({ systemPrompt, userPrompt });
    } catch (err) {
        console.warn('⚠️ web_search call failed, falling back to simple content analysis:', err.message);
        // Fallback: fetch readable text via proxy and analyze without tools
        const proxyUrl = `https://r.jina.ai/http://${hostname}`;
        let siteText = '';
        try {
            const r = await fetch(proxyUrl, { headers: { 'User-Agent': 'ContractorCRM/1.0' }, timeout: 10000 });
            if (r.ok) siteText = (await r.text()).slice(0, 12000);
        } catch (_) { }
        const fallbackSystem = 'אתה מנתח אתרי חברות בניה ונדל"ן. הסתמך רק על הטקסט שסופק וכתוב תקציר מפורט באורך 1000 מילים בדיוק - לא פחות ולא יותר!';
        const fallbackUser = `נתח את החברה מהדומיין ${hostname} לפי הטקסט הבא:

${siteText}

החזר JSON בלבד במבנה:
{
  "companyName": "שם החברה",
  "about": "תיאור מפורט של החברה באורך 1000 מילים בדיוק הכולל היסטוריה, תחומי פעילות, ניסיון, ערכים, חזון, פרויקטים בולטים, צוות מקצועי, טכנולוגיות מתקדמות, שירותים, לקוחות, הישגים ותעודות",
  "safety": "מידע מפורט על בטיחות, הסמכות, תקנים, תעודות איכות, מדיניות בטיחות ונהלים (500-700 מילים)",
  "projects": ["פרויקט 1 עם תיאור מפורט", "פרויקט 2 עם תיאור מפורט"],
  "logoUrl": null
}

חשוב מאוד: 
- about צריך להיות בדיוק 1000 מילים - לא פחות ולא יותר!
- safety צריך להיות מפורט עם דגשי בטיחות ספציפיים (500-700 מילים)
- projects צריך לכלול תיאורים מפורטים
- אם אין מספיק מידע, הרחב את התיאור עם פרטים כלליים על החברה`;
        rawResponse = await callOpenAIChatSimple({ systemPrompt: fallbackSystem, userPrompt: fallbackUser });
    }

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

    // Search for logo if not found in AI response
    let logoUrl = parsed?.logoUrl || null;
    if (!logoUrl) {
        console.log('🔍 No logo found in AI response, searching Google...');
        logoUrl = await searchGoogleForLogo(displayName, hostname);
    }

    const result = {
        companyName: parsed?.companyName || displayName,
        about: parsed?.about || '',
        safety: parsed?.safety || '',
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

module.exports = router;
