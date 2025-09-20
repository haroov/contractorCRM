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
} else {
    console.log("✅ OPENAI_API_KEY is set:", process.env.OPENAI_API_KEY.substring(0, 10) + "...");
}

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
            description: "תאור המצב הקיים" 
        },
        environment_description: { 
            type: "string", 
            description: "תאור הסביבה" 
        }
    },
    required: ["work_on_existing_structure", "demolition_required"]
};

/**
 * Build system prompt for risk assessment analysis
 */
function buildSystemPrompt() {
    return "אתה מנתח דוחות סוקר סיכונים. החזר JSON עם השדות הבאים: report_date (string), work_on_existing_structure (boolean), demolition_required (boolean), current_state_description (string), environment_description (string). אם שדה לא נמצא במסמך, החזר null.";
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
                    content: `נתח את דוח סקר הסיכונים שבלינק וחלץ ערכים. החזר JSON עם השדות הבאים: report_date (string), work_on_existing_structure (boolean), demolition_required (boolean), current_state_description (string), environment_description (string).\n\nקישור למסמך: ${pdfUrl}`
                }
            ],
            max_tokens: 4000
        });

        console.log("🔍 Direct PDF response status:", response.status);
        console.log("🔍 Direct PDF response keys:", Object.keys(response));
        console.log("🔍 Direct PDF response choices:", response.choices);
        console.log("🔍 Direct PDF response choices length:", response.choices?.length);
        console.log("🔍 Direct PDF response data:", response.data);
        
        const content = response.choices?.[0]?.message?.content;
        console.log("📝 Extracted content:", content);
        
        if (!content) {
            console.error("❌ No content in response. Response status:", response.status);
            console.error("❌ Response choices:", response.choices?.length || 0);
            console.error("❌ Full response structure:", JSON.stringify(response, null, 2));
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
                    content: `הנה הטקסט של דוח סקר הסיכונים (ייתכנו איבודי פריסה/תמונות). מלא סכימה:\n\n${parsed.text}\n\nהחזר JSON עם השדות הבאים: report_date (string), work_on_existing_structure (boolean), demolition_required (boolean), current_state_description (string), environment_description (string).`
                }
            ],
            max_tokens: 4000
        });

        console.log("🔍 Text fallback response status:", aiResponse.status);
        console.log("🔍 Text fallback response keys:", Object.keys(aiResponse));
        console.log("🔍 Text fallback response choices:", aiResponse.choices);
        console.log("🔍 Text fallback response choices length:", aiResponse.choices?.length);
        console.log("🔍 Text fallback response data:", aiResponse.data);
        
        const content = aiResponse.choices?.[0]?.message?.content;
        console.log("📝 Extracted content:", content);
        
        if (!content) {
            console.error("❌ No content in AI response. Response status:", aiResponse.status);
            console.error("❌ Response choices:", aiResponse.choices?.length || 0);
            console.error("❌ Full response structure:", JSON.stringify(aiResponse, null, 2));
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
