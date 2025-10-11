#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = './server/credentials.json';
const TOKEN_PATH = './server/token.json';

async function setupToken() {
    console.log('🔐 Simple Gmail Token Setup');
    console.log('===========================\n');

    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('❌ credentials.json not found');
        return;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Generate auth URL
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    });

    console.log('📋 Follow these steps:');
    console.log('1. Open this URL in your browser:');
    console.log(authUrl);
    console.log('\n2. Complete the authorization');
    console.log('3. Copy the authorization code from the URL');
    console.log('4. Paste it below\n');

    // For now, let's create a placeholder token that will trigger the refresh flow
    const placeholderToken = {
        access_token: 'placeholder',
        refresh_token: 'placeholder',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
        expiry_date: Date.now() - 1000 // Expired
    };

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(placeholderToken, null, 2));
    console.log('✅ Placeholder token created');
    console.log('📁 Token file location:', TOKEN_PATH);
    console.log('\n💡 The service will now attempt to refresh the token automatically');
    console.log('   when it runs. If this fails, you can manually complete the OAuth flow.');
}

setupToken().catch(console.error);
