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

    const payload = {
        model: OPENAI_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        tools: [{ type: 'web_search' }],
        temperature: 0.2,
        max_tokens: 4000
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
חשוב מאוד: עליך להשתמש בכלי web_search כדי לחפש מידע עדכני על החברה מהאתר ${hostname}.
אל תסתמך על הידע הקיים שלך - חפש מידע חדש ומעודכן מהאינטרנט.`;

    const userPrompt = `אנא חפש מידע על החברה "${displayName}" (${hostname}) באמצעות web_search.
חפש מידע על:
1. שם החברה המדויק
2. תיאור החברה ופעילותה
3. פרויקטים שביצעה או מבצעת
4. מידע על בטיחות והסמכות
5. לוגו החברה (אם קיים)

החזר את המידע בפורמט JSON הבא:
{
  "companyName": "שם החברה המדויק",
  "about": "תיאור מפורט של החברה (3-5 משפטים בעברית)",
  "safety": "מידע על בטיחות, הסמכות ותקנים",
  "projects": ["פרויקט 1", "פרויקט 2", "פרויקט 3"],
  "logoUrl": "URL של הלוגו או null"
}

חשוב: החזר רק JSON תקין ללא טקסט נוסף.`;

    const rawResponse = await callOpenAIChatWithWebSearch({ systemPrompt, userPrompt });
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

    const result = {
        companyName: parsed?.companyName || displayName,
        about: parsed?.about || '',
        safety: parsed?.safety || '',
        projects: normalizeProjects(parsed?.projects),
        logoUrl: parsed?.logoUrl || null
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
