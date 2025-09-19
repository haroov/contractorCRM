const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI.OpenAIApi(new OpenAI.Configuration({
  apiKey: process.env.OPENAI_API_KEY || '',
}));

class DocumentParserService {
  /**
   * Parse a soil report document and extract relevant information
   */
  static async parseSoilReport(fileUrl) {
    try {
      console.log('🔍 Starting document parsing for:', fileUrl);
      
      // Validate URL first
      if (!fileUrl || typeof fileUrl !== 'string') {
        throw new Error('Invalid file URL provided');
      }
      
      try {
        new URL(fileUrl);
      } catch (urlError) {
        throw new Error(`Invalid URL format: ${fileUrl}`);
      }
      
      // First, we need to download and read the document
      const documentText = await this.extractTextFromDocument(fileUrl);
      
      if (!documentText) {
        throw new Error('Could not extract text from document');
      }

      console.log('📄 Extracted text length:', documentText.length);

      // Use OpenAI to analyze the document and extract structured data
      const extractedData = await this.extractDataWithOpenAI(documentText);
      
      console.log('✅ Successfully extracted data:', extractedData);
      return extractedData;
      
    } catch (error) {
      console.error('❌ Error parsing soil report:', error);
      throw error;
    }
  }

  /**
   * Extract text from various document formats
   */
  static async extractTextFromDocument(fileUrl) {
    try {
      // For now, we'll use a simple approach
      // In production, you might want to use specialized libraries for PDF parsing
      
      const response = await fetch(fileUrl);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Document not found (404). Please check if the file URL is correct and accessible.`);
        } else if (response.status === 403) {
          throw new Error(`Access denied (403). The document may be private or require authentication.`);
        } else {
          throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
        }
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/pdf')) {
        // For PDF files, we'll use OpenAI's vision capabilities
        return await this.extractTextFromPDF(fileUrl);
      } else if (contentType?.includes('image/')) {
        // For image files, we'll use OpenAI's vision capabilities
        return await this.extractTextFromImage(fileUrl);
      } else {
        // For text files
        return await response.text();
      }
      
    } catch (error) {
      console.error('Error extracting text from document:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF using OpenAI Vision API
   */
  static async extractTextFromPDF(fileUrl) {
    try {
      // Convert PDF to images and use vision API
      // This is a simplified approach - in production you might want to use pdf-poppler
      const response = await openai.createChatCompletion({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract all text from this document. Return only the raw text content without any formatting or analysis."
              },
              {
                type: "image_url",
                image_url: {
                  url: fileUrl
                }
              }
            ]
          }
        ],
        max_tokens: 4000
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  }

  /**
   * Extract text from image using OpenAI Vision API
   */
  static async extractTextFromImage(fileUrl) {
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract all text from this image. Return only the raw text content without any formatting or analysis."
              },
              {
                type: "image_url",
                image_url: {
                  url: fileUrl
                }
              }
            ]
          }
        ],
        max_tokens: 4000
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error extracting text from image:', error);
      throw error;
    }
  }

  /**
   * Use OpenAI to extract structured data from document text
   */
  static async extractDataWithOpenAI(documentText) {
    try {
      const prompt = `
אתה מומחה בקריאת דוחות קרקע וחפירה. אנא קרא את הטקסט הבא וחלץ את המידע הרלוונטי למילוי טופס פרויקט בניה.

טקסט המסמך:
${documentText}

אנא חלץ את המידע הבא וחזור בתשובה בפורמט JSON:

{
  "soilType": "סוג הקרקע (חולית/טיטית/אחר)",
  "soilTypeOther": "אם סוג הקרקע הוא 'אחר', פרט כאן",
  "groundwaterDepth": מספר עומק מי התהום במטרים,
  "excavationDepth": מספר עומק החפירה במטרים,
  "excavationArea": מספר שטח החפירה במ"ר,
  "foundationMethod": "שיטת ביצוע היסודות",
  "perimeterDewatering": true/false - האם מבצעים דיפון היקפי,
  "constructionMethod": "שיטת הבניה (קונבנציונאלי/טרומי/אחר)",
  "constructionMethodOther": "אם שיטת הבניה היא 'אחר', פרט כאן",
  "maxColumnSpacing": מספר מפתח מירבי בין עמודים במטרים,
  "environmentalDescription": "תיאור הסביבה",
  "currentSituationDescription": "תיאור המצב הקיים",
  "png25EarthquakeRating": "ציון PNG25 לרעידות אדמה",
  "area": "אזור הפרויקט"
}

אם מידע מסוים לא נמצא במסמך, השאר את השדה ריק או null.
חזור רק עם ה-JSON, ללא הסברים נוספים.
`;

      const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "אתה מומחה בקריאת דוחות קרקע וחפירה. תמיד חזור עם JSON תקין בלבד."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsedData = JSON.parse(content);
        return this.validateAndCleanData(parsedData);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.log('Raw response:', content);
        throw new Error('Failed to parse OpenAI response');
      }
      
    } catch (error) {
      console.error('Error extracting data with OpenAI:', error);
      throw error;
    }
  }

  /**
   * Validate and clean the extracted data
   */
  static validateAndCleanData(data) {
    const cleaned = {};

    // Validate soil type
    if (data.soilType && typeof data.soilType === 'string') {
      const validSoilTypes = ['חולית', 'טיטית', 'אחר'];
      if (validSoilTypes.includes(data.soilType)) {
        cleaned.soilType = data.soilType;
        if (data.soilType === 'אחר' && data.soilTypeOther) {
          cleaned.soilTypeOther = data.soilTypeOther;
        }
      }
    }

    // Validate numeric fields
    if (data.groundwaterDepth && !isNaN(Number(data.groundwaterDepth))) {
      cleaned.groundwaterDepth = Number(data.groundwaterDepth);
    }
    if (data.excavationDepth && !isNaN(Number(data.excavationDepth))) {
      cleaned.excavationDepth = Number(data.excavationDepth);
    }
    if (data.excavationArea && !isNaN(Number(data.excavationArea))) {
      cleaned.excavationArea = Number(data.excavationArea);
    }
    if (data.maxColumnSpacing && !isNaN(Number(data.maxColumnSpacing))) {
      cleaned.maxColumnSpacing = Number(data.maxColumnSpacing);
    }

    // Validate boolean fields
    if (typeof data.perimeterDewatering === 'boolean') {
      cleaned.perimeterDewatering = data.perimeterDewatering;
    }

    // Validate construction method
    if (data.constructionMethod && typeof data.constructionMethod === 'string') {
      const validMethods = ['קונבנציונאלי', 'טרומי', 'אחר'];
      if (validMethods.includes(data.constructionMethod)) {
        cleaned.constructionMethod = data.constructionMethod;
        if (data.constructionMethod === 'אחר' && data.constructionMethodOther) {
          cleaned.constructionMethodOther = data.constructionMethodOther;
        }
      }
    }

    // Validate text fields
    if (data.foundationMethod && typeof data.foundationMethod === 'string') {
      cleaned.foundationMethod = data.foundationMethod;
    }
    if (data.environmentalDescription && typeof data.environmentalDescription === 'string') {
      cleaned.environmentalDescription = data.environmentalDescription;
    }
    if (data.currentSituationDescription && typeof data.currentSituationDescription === 'string') {
      cleaned.currentSituationDescription = data.currentSituationDescription;
    }
    if (data.png25EarthquakeRating && typeof data.png25EarthquakeRating === 'string') {
      cleaned.png25EarthquakeRating = data.png25EarthquakeRating;
    }
    if (data.area && typeof data.area === 'string') {
      cleaned.area = data.area;
    }

    return cleaned;
  }
}

module.exports = { DocumentParserService };
