const { google } = require('googleapis');

// Initialize Google Docs API with API Key
const initializeDocsApi = () => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error('❌ GOOGLE_API_KEY is required for Google Docs API');
      return null;
    }

    // For public documents, we can use the API with just an API key
    const docs = google.docs({
      version: 'v1',
      auth: apiKey
    });

    return docs;
  } catch (error) {
    console.error('Error initializing Google Docs API:', error);
    return null;
  }
};

module.exports = {
  initializeDocsApi
};
