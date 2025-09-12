const { google } = require('googleapis');

// Google API configuration
const googleApiConfig = {
  // For public documents, we can use the API without authentication
  // For private documents, you would need to set up OAuth2 or Service Account
  docs: {
    version: 'v1',
    // You can add API key here if needed
    // key: process.env.GOOGLE_API_KEY
  }
};

// Initialize Google Docs API
const initializeDocsApi = () => {
  try {
    const docs = google.docs({
      version: googleApiConfig.docs.version,
      // Add API key if available
      ...(process.env.GOOGLE_API_KEY && { key: process.env.GOOGLE_API_KEY })
    });
    
    return docs;
  } catch (error) {
    console.error('Error initializing Google Docs API:', error);
    return null;
  }
};

module.exports = {
  googleApiConfig,
  initializeDocsApi
};
