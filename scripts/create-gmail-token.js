#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CREDENTIALS_PATH = './server/credentials.json';
const TOKEN_PATH = './server/token.json';

async function createGmailToken() {
    console.log('🔐 Gmail Token Creator');
    console.log('=====================\n');

    // Check if credentials file exists
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('❌ Error: credentials.json not found at', CREDENTIALS_PATH);
        console.log('   Please ensure the credentials file exists');
        process.exit(1);
    }

    console.log('✅ Found credentials.json');

    try {
        // Load credentials
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.installed;

        // Create OAuth2 client
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        // Check if we already have a token
        if (fs.existsSync(TOKEN_PATH)) {
            console.log('⚠️ Token file already exists. Backing up...');
            fs.copyFileSync(TOKEN_PATH, TOKEN_PATH + '.backup');
        }

        // Get authorization URL
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        console.log('\n🔗 Step 1: Open this URL in your browser:');
        console.log(authUrl);
        console.log('\n📋 Step 2: Complete the authorization:');
        console.log('   1. Sign in with your Google account');
        console.log('   2. Grant permission to access Gmail');
        console.log('   3. Copy the authorization code from the URL');
        console.log('\n⏳ Step 3: Paste the authorization code below:');

        // Create readline interface
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        // Wait for user input
        const code = await new Promise((resolve) => {
            rl.question('Authorization code: ', (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });

        if (!code) {
            console.error('❌ No authorization code provided');
            process.exit(1);
        }

        console.log('\n🔄 Exchanging code for token...');

        // Exchange code for token
        const { tokens } = await oAuth2Client.getToken(code);

        // Save token
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

        console.log('✅ Token created successfully!');
        console.log('📁 Token file location:', TOKEN_PATH);
        console.log('\n🎉 Gmail API setup complete!');
        console.log('\n📋 Next steps:');
        console.log('   1. Test the service: npm run test:safety-monitor');
        console.log('   2. Start the server: npm run server');
        console.log('   3. The cron job will automatically fetch safety reports daily');

    } catch (error) {
        console.error('❌ Error creating token:', error.message);
        if (error.message.includes('invalid_grant')) {
            console.log('\n💡 This usually means:');
            console.log('   - The authorization code has expired (try again)');
            console.log('   - The code was already used');
            console.log('   - The redirect URI doesn\'t match');
            console.log('\n🔄 Try running this script again to get a fresh authorization code');
        }
        process.exit(1);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    createGmailToken().catch(console.error);
}

module.exports = { createGmailToken };
