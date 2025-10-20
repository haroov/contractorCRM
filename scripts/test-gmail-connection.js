const { google } = require('googleapis');
const fs = require('fs');

async function testGmailConnection() {
    try {
        console.log('🧪 Testing Gmail API Connection...');

        // Load credentials
        const credentials = JSON.parse(fs.readFileSync('./server/credentials.json'));
        const { client_secret, client_id, redirect_uris } = credentials.installed;

        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        // Load token
        const token = JSON.parse(fs.readFileSync('./server/token.json'));
        oAuth2Client.setCredentials(token);

        console.log('✅ Gmail API authorized successfully');

        // Test Gmail API
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

        // Search for any emails from safeguard
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: 'from:support@safeguardapps.com',
            maxResults: 10,
        });

        console.log(`📧 Found ${res.data.messages?.length || 0} emails from Safeguard`);

        if (res.data.messages && res.data.messages.length > 0) {
            console.log('📬 Recent emails:');
            for (let i = 0; i < Math.min(3, res.data.messages.length); i++) {
                const message = await gmail.users.messages.get({
                    userId: 'me',
                    id: res.data.messages[i].id,
                    format: 'full'
                });

                const subject = message.data.payload.headers.find(h => h.name === 'Subject')?.value || 'No subject';
                const from = message.data.payload.headers.find(h => h.name === 'From')?.value || 'No sender';
                const date = message.data.payload.headers.find(h => h.name === 'Date')?.value || 'No date';

                console.log(`  ${i + 1}. Subject: ${subject}`);
                console.log(`     From: ${from}`);
                console.log(`     Date: ${date}`);
                console.log('');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('invalid_grant')) {
            console.log('💡 Token expired. Run: node scripts/generate-gmail-auth-url.js');
        }
    }
}

testGmailConnection();

