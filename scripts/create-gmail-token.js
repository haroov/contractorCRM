const fs = require('fs');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = './server/token.json';
const CREDENTIALS_PATH = './server/credentials.json';

async function createTokenFromCode(authCode) {
    try {
        console.log('🔑 יצירת טוקן Gmail מהקוד...');

        // Load credentials
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.installed;

        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        // Exchange code for token
        const { tokens } = await oAuth2Client.getToken(authCode);
        oAuth2Client.setCredentials(tokens);

        // Save token
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log('✅ טוקן נשמר בהצלחה!');
        console.log('📁 קובץ הטוקן:', TOKEN_PATH);
        console.log('🎉 השירות מוכן לשימוש!');

    } catch (error) {
        console.error('❌ שגיאה ביצירת הטוקן:', error.message);
        if (error.message.includes('invalid_grant')) {
            console.log('💡 הקוד כבר שומש או פג תוקף. נסה לקבל קוד חדש.');
        }
    }
}

// Get auth code from command line argument
const authCode = process.argv[2];
if (!authCode) {
    console.log('❌ אנא ספק קוד הרשאה');
    console.log('שימוש: node scripts/create-gmail-token.js [קוד_הרשאה]');
    process.exit(1);
}

createTokenFromCode(authCode);