const { Router } = require("express");
const OpenAI = require("openai");
const pdfParse = require("pdf-parse");
const fetch = require("node-fetch");

const router = Router();

// Initialize OpenAI client - compatible with openai v3.3.0
const client = new OpenAI.OpenAIApi(new OpenAI.Configuration({
    apiKey: process.env.OPENAI_API_KEY
}));

// Check if API key is available
if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is not set!");
}

/**
 * Schema for risk assessment report analysis
 */
const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
        reportDate: { 
            type: "string", 
            description: "יום עריכת הדוח" 
        },
        workOnExistingStructure: { 
            type: "boolean", 
            description: "עבודה על מבנה קיים (כן/לא)" 
        },
        demolitionWork: { 
            type: "boolean", 
            description: "הריסת מבנים (כן/לא)" 
        },
        currentStateDescription: { 
            type: "string", 
            description: "תאור המצב הקיים" 
        },
        environmentDescription: { 
            type: "string", 
            description: "תאור הסביבה" 
        }
    },
    required: ["workOnExistingStructure", "demolitionWork"]
};

/**
 * Build system prompt for risk assessment analysis
 */
function buildSystemPrompt() {
    return "אתה מנתח דוחות סוקר סיכונים. החזר JSON עם השדות הבאים: reportDate (string), workOnExistingStructure (boolean), demolitionWork (boolean), currentStateDescription (string), environmentDescription (string). אם שדה לא נמצא במסמך, החזר null.";
}

/**
 * Try to analyze PDF directly via URL using vision models
 */
function isSafeHttpUrl(url) {
    try {
        const u = new URL(url);
        if (!['http:', 'https:'].includes(u.protocol)) return false;
        // Block localhost and private IP ranges
        const host = u.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false;
        const privateCidrs = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./];
        if (privateCidrs.some(re => re.test(host))) return false;
        return true;
    } catch {
        return false;
    }
}

async function tryDirectPdfUrl(pdfUrl) {
    try {
        const response = await client.createChatCompletion({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: buildSystemPrompt()
                },
                {
                    role: "user",
                    content: `נתח את דוח סקר הסיכונים שבלינק וחלץ ערכים. החזר JSON עם השדות הבאים: reportDate (string), workOnExistingStructure (boolean), demolitionWork (boolean), currentStateDescription (string), environmentDescription (string).\n\nקישור למסמך: ${pdfUrl}`
                }
            ],
            max_tokens: 4000
        });

        console.log("🔍 Direct PDF response status:", response.status);
        console.log("🔍 Direct PDF response keys:", Object.keys(response));
        console.log("🔍 Direct PDF response data keys:", Object.keys(response.data || {}));
        console.log("🔍 Direct PDF response data.choices:", response.data?.choices);
        console.log("🔍 Direct PDF response data.choices length:", response.data?.choices?.length);
        
        const content = response.data?.choices?.[0]?.message?.content;
        console.log("📝 Extracted content:", content);
        
        if (!content) {
            console.error("❌ No content in response. Response status:", response.status);
            console.error("❌ Response choices:", response.choices?.length || 0);
            console.error("❌ Full response structure:", JSON.stringify(response, null, 2));
            throw new Error("No content in response");
        }

        // Clean markdown formatting from content
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log("🧹 Cleaned content:", cleanContent);
        return JSON.parse(cleanContent);
    } catch (error) {
        console.error("Direct PDF URL analysis failed:", error);
        throw error;
    }
}

/**
 * Fallback: Download PDF and extract text, then analyze
 */
async function tryTextFallback(pdfUrl) {
    try {
        console.log("🔍 Attempting to fetch PDF from URL:", pdfUrl);
        if (!isSafeHttpUrl(pdfUrl)) {
            throw new Error('Blocked URL by SSRF protection');
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(pdfUrl, { signal: controller.signal, redirect: 'follow', size: 10 * 1024 * 1024 });
        clearTimeout(timeout);
        console.log("📡 Response status:", response.status);
        console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Failed to fetch PDF:", response.status, errorText);
            throw new Error(`Failed to fetch PDF: ${response.status} - ${errorText}`);
        }

        const buffer = await response.buffer();
        const parsed = await pdfParse(buffer);

        const aiResponse = await client.createChatCompletion({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: buildSystemPrompt()
                },
                {
                    role: "user",
                    content: `אתה מנתח דוח סקר סיכונים. הנה הטקסט של הדוח:\n\n${parsed.text}\n\nחלץ את המידע הבא וחזור JSON בלבד:\n- reportDate: תאריך הדוח\n- workOnExistingStructure: האם יש עבודה על מבנה קיים (true/false)\n- demolitionWork: האם יש הריסת מבנה (true/false)\n- currentStateDescription: תיאור המצב הקיים\n- environmentDescription: תיאור הסביבה\n\nהחזר רק JSON ללא הסברים נוספים.`
                }
            ],
            max_tokens: 4000
        });

        console.log("🔍 Text fallback response status:", aiResponse.status);
        console.log("🔍 Text fallback response keys:", Object.keys(aiResponse));
        console.log("🔍 Text fallback response data keys:", Object.keys(aiResponse.data || {}));
        console.log("🔍 Text fallback response data.choices:", aiResponse.data?.choices);
        console.log("🔍 Text fallback response data.choices length:", aiResponse.data?.choices?.length);
        
        const content = aiResponse.data?.choices?.[0]?.message?.content;
        console.log("📝 Extracted content:", content);
        
        if (!content) {
            console.error("❌ No content in AI response. Response status:", aiResponse.status);
            console.error("❌ Response choices:", aiResponse.choices?.length || 0);
            console.error("❌ Full response structure:", JSON.stringify(aiResponse, null, 2));
            throw new Error("No content in AI response");
        }

        // Clean markdown formatting from content
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log("🧹 Cleaned content:", cleanContent);
        return JSON.parse(cleanContent);
    } catch (error) {
        console.error("Text fallback analysis failed:", error);
        throw error;
    }
}

/**
 * Main API endpoint for risk assessment analysis
 */
router.post("/analyze-report", async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: "URL is required"
            });
        }

        console.log("🔍 Analyzing risk assessment report:");
        console.log("📄 URL:", url);
        console.log("📄 URL type:", typeof url);
        console.log("📄 URL length:", url?.length);

        if (!isSafeHttpUrl(url)) {
            return res.status(400).json({ success: false, error: 'Invalid or unsafe URL' });
        }

        let data;
        try {
            // Try direct PDF URL analysis first
            data = await tryDirectPdfUrl(url);
            console.log("✅ Direct PDF analysis successful");
        } catch (error) {
            console.log("⚠️ Direct PDF analysis failed, trying text fallback:", error.message);
            // Fallback to text extraction
            data = await tryTextFallback(url);
            console.log("✅ Text fallback analysis successful");
        }

        console.log("📊 Analysis result:", JSON.stringify(data, null, 2));

        return res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error("❌ Risk analysis failed:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Analysis failed"
        });
    }
});

module.exports = router;
