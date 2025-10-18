const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = './server/token.json';
const CREDENTIALS_PATH = './server/credentials.json';

async function createToken() {
    try {
        console.log('🔑 יצירת טוקן Gmail חדש...');

        // Load credentials
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.installed;

        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        // Get authorization URL
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        console.log('\n🌐 פתח את הכתובת הזו בדפדפן:');
        console.log(authUrl);
        console.log('\n📋 העתק את הקוד מהדפדפן והדבק כאן:');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question('קוד הרשאה: ', async (code) => {
            try {
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);

                // Save token
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
                console.log('✅ טוקן נשמר בהצלחה!');
                console.log('📁 קובץ הטוקן:', TOKEN_PATH);

                rl.close();
            } catch (error) {
                console.error('❌ שגיאה ביצירת הטוקן:', error.message);
                rl.close();
            }
        });

    } catch (error) {
        console.error('❌ שגיאה:', error.message);
    }
}

createToken();




