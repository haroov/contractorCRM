const OpenAI = require('openai');
const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

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
   * Parse a Garmoshka (building plans) document and extract relevant information
   */
  static async parseGarmoshkaReport(fileUrl) {
    try {
      console.log('🔍 Starting Garmoshka document parsing for:', fileUrl);

      // Validate URL first
      if (!fileUrl || typeof fileUrl !== 'string') {
        throw new Error('Invalid file URL provided');
      }

      try {
        new URL(fileUrl);
      } catch (urlError) {
        throw new Error(`Invalid URL format: ${fileUrl}`);
      }

      // For PDF files, use OpenAI Vision API directly
      const documentText = await this.extractTextFromPDF(fileUrl);

      if (!documentText || documentText === 'Unable to read document') {
        throw new Error('Could not extract text from document');
      }

      console.log('📄 Extracted text length:', documentText.length);

      // Use OpenAI to analyze the document and extract structured data for building plans
      const extractedData = await this.extractGarmoshkaDataWithOpenAI(documentText);

      console.log('✅ Successfully extracted Garmoshka data:', extractedData);
      return extractedData;

    } catch (error) {
      console.error('❌ Error parsing Garmoshka report:', error);
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

      const response = await axios.get(fileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/pdf,image/*,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const contentType = response.headers['content-type'];

      if (contentType?.includes('application/pdf')) {
        // For PDF files, we'll use OpenAI's vision capabilities
        return await this.extractTextFromPDF(fileUrl);
      } else if (contentType?.includes('image/')) {
        // For image files, we'll use OpenAI's vision capabilities
        return await this.extractTextFromImage(fileUrl);
      } else {
        // For text files
        return response.data.toString('utf8');
      }

    } catch (error) {
      console.error('Error extracting text from document:', error);
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          throw new Error(`Document not found (404). Please check if the file URL is correct and accessible.`);
        } else if (status === 403) {
          throw new Error(`Access denied (403). The document may be private or require authentication.`);
        } else if (status === 401) {
          throw new Error(`Unauthorized (401). The document may require authentication or have restricted access.`);
        } else {
          throw new Error(`Failed to fetch document: ${status} ${error.response.statusText}`);
        }
      } else if (error.request) {
        throw new Error(`Network error: Unable to reach the document URL.`);
      } else {
        throw new Error(`Error: ${error.message}`);
      }
    }
  }

  /**
   * Extract text from PDF using OpenAI Vision API
   */
  static async extractTextFromPDF(fileUrl) {
    try {
      // Use OpenAI Vision API directly with the URL
      const response = await openai.createChatCompletion({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract all text from this PDF document. Return only the raw text content without any formatting or analysis. If you cannot read the document, please return 'Unable to read document'."
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
   * Use OpenAI to extract structured data from Garmoshka document text
   */
  static async extractGarmoshkaDataWithOpenAI(documentText) {
    try {
      const prompt = `
אתה מומחה בקריאת תוכניות בניה (גרמושקה). אנא קרא את הטקסט הבא וחלץ את המידע הרלוונטי למילוי טופס פרויקט בניה.

טקסט המסמך:
${documentText}

אנא חלץ את המידע הבא וחזור בתשובה בפורמט JSON:

{
  "projectType": "סוג הפרויקט (בניה/תשתית/אחר)",
  "projectTypeOther": "אם סוג הפרויקט הוא 'אחר', פרט כאן",
  "governmentProgram": true/false - האם זה פרויקט ממשלתי,
  "buildingHeight": מספר קומות,
  "totalArea": מספר שטח כולל במ"ר,
  "undergroundFloors": מספר קומות תת קרקעיות,
  "constructionMethod": "שיטת הבניה (קונבנציונאלי/טרומי/אחר)",
  "constructionMethodOther": "אם שיטת הבניה היא 'אחר', פרט כאן",
  "foundationType": "סוג היסודות",
  "structuralSystem": "מערכת קונסטרוקטיבית",
  "maxColumnSpacing": מספר מפתח מירבי בין עמודים במטרים,
  "seismicDesign": "תכנון סיסמי",
  "fireResistance": "עמידות באש",
  "accessibility": "נגישות",
  "parkingSpaces": מספר מקומות חניה,
  "elevators": מספר מעליות",
  "buildingMaterials": "חומרי בניה עיקריים",
  "specialFeatures": "תכונות מיוחדות",
  "complianceStandards": "תקנים ותקנות רלוונטיים"
}

אם מידע מסוים לא נמצא במסמך, השאר את השדה ריק או null.
חזור רק עם ה-JSON, ללא הסברים נוספים.
`;

      const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "אתה מומחה בקריאת תוכניות בניה (גרמושקה). תמיד חזור עם JSON תקין בלבד."
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
        // Safely parse JSON to prevent prototype pollution
        const parsedData = JSON.parse(content, (key, value) => {
          // Prevent prototype pollution by rejecting dangerous keys
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            return undefined;
          }
          return value;
        });
        return this.validateAndCleanGarmoshkaData(parsedData);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.log('Raw response:', content);
        throw new Error('Failed to parse OpenAI response');
      }

    } catch (error) {
      console.error('Error extracting Garmoshka data with OpenAI:', error);
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
        // Safely parse JSON to prevent prototype pollution
        const parsedData = JSON.parse(content, (key, value) => {
          // Prevent prototype pollution by rejecting dangerous keys
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            return undefined;
          }
          return value;
        });
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
   * Validate and clean the extracted Garmoshka data
   */
  static validateAndCleanGarmoshkaData(data) {
    const cleaned = {};

    // Validate project type
    if (data.projectType && typeof data.projectType === 'string') {
      const validProjectTypes = ['בניה', 'תשתית', 'אחר'];
      if (validProjectTypes.includes(data.projectType)) {
        cleaned.projectType = data.projectType;
        if (data.projectType === 'אחר' && data.projectTypeOther) {
          cleaned.projectTypeOther = data.projectTypeOther;
        }
      }
    }

    // Validate boolean fields
    if (typeof data.governmentProgram === 'boolean') {
      cleaned.governmentProgram = data.governmentProgram;
    }

    // Validate numeric fields
    if (data.buildingHeight && !isNaN(Number(data.buildingHeight))) {
      cleaned.buildingHeight = Number(data.buildingHeight);
    }
    if (data.totalArea && !isNaN(Number(data.totalArea))) {
      cleaned.totalArea = Number(data.totalArea);
    }
    if (data.undergroundFloors && !isNaN(Number(data.undergroundFloors))) {
      cleaned.undergroundFloors = Number(data.undergroundFloors);
    }
    if (data.maxColumnSpacing && !isNaN(Number(data.maxColumnSpacing))) {
      cleaned.maxColumnSpacing = Number(data.maxColumnSpacing);
    }
    if (data.parkingSpaces && !isNaN(Number(data.parkingSpaces))) {
      cleaned.parkingSpaces = Number(data.parkingSpaces);
    }
    if (data.elevators && !isNaN(Number(data.elevators))) {
      cleaned.elevators = Number(data.elevators);
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
    if (data.foundationType && typeof data.foundationType === 'string') {
      cleaned.foundationType = data.foundationType;
    }
    if (data.structuralSystem && typeof data.structuralSystem === 'string') {
      cleaned.structuralSystem = data.structuralSystem;
    }
    if (data.seismicDesign && typeof data.seismicDesign === 'string') {
      cleaned.seismicDesign = data.seismicDesign;
    }
    if (data.fireResistance && typeof data.fireResistance === 'string') {
      cleaned.fireResistance = data.fireResistance;
    }
    if (data.accessibility && typeof data.accessibility === 'string') {
      cleaned.accessibility = data.accessibility;
    }
    if (data.buildingMaterials && typeof data.buildingMaterials === 'string') {
      cleaned.buildingMaterials = data.buildingMaterials;
    }
    if (data.specialFeatures && typeof data.specialFeatures === 'string') {
      cleaned.specialFeatures = data.specialFeatures;
    }
    if (data.complianceStandards && typeof data.complianceStandards === 'string') {
      cleaned.complianceStandards = data.complianceStandards;
    }

    return cleaned;
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
