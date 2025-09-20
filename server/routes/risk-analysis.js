const { Router } = require("express");
const OpenAI = require("openai");
const pdfParse = require("pdf-parse");
const fetch = require("node-fetch");

const router = Router();

// Initialize OpenAI client - compatible with openai v3.3.0
const client = new OpenAI.OpenAIApi(new OpenAI.Configuration({
    apiKey: process.env.OPENAI_API_KEY
}));

/**
 * Schema for risk assessment report analysis
 */
const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
        work_on_existing_structure: { 
            type: "boolean", 
            description: "עבודה על מבנה קיים (כן/לא)" 
        },
        demolition_required: { 
            type: "boolean", 
            description: "הרס מבנה (כן/לא)" 
        },
        incident_date: { 
            type: "string", 
            format: "date", 
            description: "תאריך יצירת המסמך/ביקור" 
        },
        site_city: { 
            type: "string",
            description: "עיר האתר"
        },
        site_address: { 
            type: "string",
            description: "כתובת האתר"
        },
        contractor_name: { 
            type: "string",
            description: "שם הקבלן"
        },
        contractor_id: { 
            type: "string", 
            description: "ח״פ/ע.מ/ת.ז אם מופיע" 
        },
        risk_summary: { 
            type: "string", 
            description: "תיאור מצב קיים/סיכום הסוקר" 
        },
        environment_description: { 
            type: "string", 
            description: "תיאור הסביבה והתנאים הסביבתיים" 
        },
        hazards: {
            type: "array",
            description: "רשימת סיכונים מזוהים",
            items: {
                type: "object",
                properties: {
                    category: { 
                        type: "string",
                        description: "קטגוריית הסיכון (בטיחות כללית, אש, חשמל, גובה וכו')"
                    },
                    severity: { 
                        type: "integer", 
                        minimum: 1, 
                        maximum: 5,
                        description: "רמת חומרה (1-5)"
                    },
                    description: { 
                        type: "string",
                        description: "תיאור הסיכון"
                    },
                    recommendation: { 
                        type: "string",
                        description: "המלצה לטיפול בסיכון"
                    }
                },
                required: ["category", "description"]
            }
        }
    },
    required: ["work_on_existing_structure", "demolition_required"]
};

/**
 * Build system prompt for risk assessment analysis
 */
function buildSystemPrompt() {
    return "אתה מנתח דוחות סוקר סיכונים באתרי בניה. המשימה: חילוץ נתונים מובנים לפי הסכימה המצורפת (JSON Schema). אם שדה לא מופיע במסמך - החזר ערך null או מחרוזת ריקה (לפי הטיפוס). היענות בעברית היכן שמתאים בתיאורים חופשיים. חשוב: החזר תמיד JSON תקין לפי הסכימה.";
}

/**
 * Try to analyze PDF directly via URL using vision models
 */
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
                    content: [
                        {
                            type: "text",
                            text: "נתח את דוח סקר הסיכונים שבלינק וחלץ ערכים לכל השדות. החזר JSON עם השדות הבאים: work_on_existing_structure (boolean), demolition_required (boolean), incident_date (string), site_city (string), site_address (string), contractor_name (string), contractor_id (string), risk_summary (string), environment_description (string), hazards (array of objects with category, severity, description, recommendation)."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: pdfUrl,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens: 4000
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No content in response");
        }

        return JSON.parse(content);
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
        const response = await fetch(pdfUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status}`);
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
                    content: `הנה הטקסט של דוח סקר הסיכונים (ייתכנו איבודי פריסה/תמונות). מלא סכימה:\n\n${parsed.text}\n\nהחזר JSON עם השדות הבאים: work_on_existing_structure (boolean), demolition_required (boolean), incident_date (string), site_city (string), site_address (string), contractor_name (string), contractor_id (string), risk_summary (string), environment_description (string), hazards (array of objects with category, severity, description, recommendation).`
                }
            ],
            max_tokens: 4000
        });

        const content = aiResponse.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No content in AI response");
        }

        return JSON.parse(content);
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

        console.log("🔍 Analyzing risk assessment report:", url);

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
