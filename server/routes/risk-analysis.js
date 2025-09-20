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
        report_date: { 
            type: "string", 
            description: "יום עריכת הדוח" 
        },
        work_on_existing_structure: { 
            type: "boolean", 
            description: "עבודה על מבנה קיים (כן/לא)" 
        },
        demolition_required: { 
            type: "boolean", 
            description: "הריסת מבנים (כן/לא)" 
        },
        current_state_description: { 
            type: "string", 
            description: "תאור המצב הקיים (טקסט חופשי, עד 500 תווים)" 
        },
        environment_description: { 
            type: "string", 
            description: "תאור הסביבה (טקסט חופשי, עד 500 תווים)" 
        },
        adjacent_buildings: { 
            type: "boolean", 
            description: "האם קיימים מבנים סמוכים (כן/לא)" 
        },
        electrical_cables: { 
            type: "boolean", 
            description: "כבלי חשמל בקרבת העגורנים (כן/לא)" 
        },
        underground_utilities: { 
            type: "boolean", 
            description: "צינורות ומתקנים תת קרקעיים (כן/לא)" 
        },
        schools_kindergartens: { 
            type: "boolean", 
            description: "גני ילדים ובתי ספר בסביבה (כן/לא)" 
        },
        proximity_to_gas_station: { 
            type: "boolean", 
            description: "קרבה לתחנת דלק (כן/לא)" 
        },
        proximity_to_police_station: { 
            type: "boolean", 
            description: "קרבה לתחנת משטרה (כן/לא)" 
        },
        proximity_to_fire_station: { 
            type: "boolean", 
            description: "קרבה לתחנת מכבי אש (כן/לא)" 
        },
        proximity_to_medical_center: { 
            type: "boolean", 
            description: "קרבת לתחנת מד״א או מרכז רפואי (כן/לא)" 
        },
        on_mountain_ridge: { 
            type: "boolean", 
            description: "האם הפרויקט על רכס הר (כן/לא)" 
        },
        in_valley: { 
            type: "boolean", 
            description: "האם הפרוייקט בודאי (כן/לא)" 
        },
        site_elevation: { 
            type: "number", 
            description: "גובה האתר מפני הים (במטרים)" 
        },
        distance_from_sea: { 
            type: "number", 
            description: "מרחק מהים (במטרים)" 
        },
        distance_from_streams: { 
            type: "number", 
            description: "מרחק מנחלים ואגנים (במטרים)" 
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
    return "אתה חתם הנדסי בחברת ביטוח ותפקידך לנתח את דוח הסוקר ולענות במדוייק על השדות להלן (לפי השמות של השדות בדאטה): יום עריכת הדוח, עבודה על מבנה קיים לא/כן, הריסת מבנים לא/כן, תאור המצב הקיים (טקסט חופשי, עד 500 תווים), תאור הסביבה (טקסט חופשי, עד 500 תווים), האם קיימים מבנים סמוכים - לא/כן, כבלי חשמל בקרבת העגורנים - לא/כן, צינורות ומתקנים תת קרקעיים - לא/כן, גני ילדים ובתי ספר בסביבה - לא/כן, קרבה לתחנת דלק - לא/כן, קרבה לתחנת משטרה - לא/כן, קרבה לתחנת מכבי אש - לא/כן, קרבת לתחנת מד״א או מרכז רפואי - לא/כן, האם הפרויקט על רכס הר - לא/כן, האם הפרוייקט בודאי - לא/כן, גובה האתר מפני הים (במטרים), מרחק מהים (במטרים), מרחק מנחלים ואגנים (במטרים). שאלות לא/כן שלא נמצא לגביהם מידע בדוח (למשל הפרויקט אינו על צלע הר ואינו בודאי ואין שום איזכור לכך בדוח ולכן התשובות יהיו לא. במקרה שאינך מוצא תשובה לשאלה, יש להשאירה ריקה למילוי ידני. חייבים לשמור על 100% דיוק.";
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
                            text: "נתח את דוח סקר הסיכונים שבלינק וחלץ ערכים לכל השדות. החזר JSON עם השדות הבאים: report_date (string), work_on_existing_structure (boolean), demolition_required (boolean), current_state_description (string), environment_description (string), adjacent_buildings (boolean), electrical_cables (boolean), underground_utilities (boolean), schools_kindergartens (boolean), proximity_to_gas_station (boolean), proximity_to_police_station (boolean), proximity_to_fire_station (boolean), proximity_to_medical_center (boolean), on_mountain_ridge (boolean), in_valley (boolean), site_elevation (number), distance_from_sea (number), distance_from_streams (number)."
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
                    content: `הנה הטקסט של דוח סקר הסיכונים (ייתכנו איבודי פריסה/תמונות). מלא סכימה:\n\n${parsed.text}\n\nהחזר JSON עם השדות הבאים: report_date (string), work_on_existing_structure (boolean), demolition_required (boolean), current_state_description (string), environment_description (string), adjacent_buildings (boolean), electrical_cables (boolean), underground_utilities (boolean), schools_kindergartens (boolean), proximity_to_gas_station (boolean), proximity_to_police_station (boolean), proximity_to_fire_station (boolean), proximity_to_medical_center (boolean), on_mountain_ridge (boolean), in_valley (boolean), site_elevation (number), distance_from_sea (number), distance_from_streams (number).`
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
