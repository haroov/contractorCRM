const fs = require('fs');
const { google } = require('googleapis');

// Load credentials from file
const credentials = JSON.parse(fs.readFileSync('./server/credentials.json'));
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

function generateAuthUrl() {
  const oAuth2Client = new google.auth.OAuth2(
    credentials.installed.client_id,
    credentials.installed.client_secret,
    credentials.installed.redirect_uris[0]
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('🔑 יצירת כתובת הרשאה Gmail');
  console.log('=====================================');
  console.log('📋 פתח את הכתובת הזו בדפדפן:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('📝 הוראות:');
  console.log('1. פתח את הכתובת בדפדפן');
  console.log('2. בחר את החשבון ai@chocoinsurance.com');
  console.log('3. אשר את ההרשאות');
  console.log('4. העתק את הקוד מהדפדפן');
  console.log('5. הפעל: node scripts/create-gmail-token.js [הקוד]');
  console.log('');
}

generateAuthUrl();
