# Google OAuth Setup Guide

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account
3. Create a new project or select existing one
4. Note the project ID

### 1.2 Enable Google+ API
1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click **Enable**

### 1.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Select **Web application**
4. Give it a name: "Contractor CRM"
5. Add **Authorized redirect URIs**:
   ```
   https://contractorcrm-api.onrender.com/auth/google/callback
   ```
6. Click **Create**
7. **Copy the Client ID and Client Secret** (you'll need these)

## Step 2: Render Dashboard Setup

### 2.1 Access Render Dashboard
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your service: `contractorCRM-api`
3. Click on **Environment** tab

### 2.2 Add Environment Variables
Click **Add Environment Variable** for each:

#### GOOGLE_CLIENT_ID
- **Key**: `GOOGLE_CLIENT_ID`
- **Value**: Your Google Client ID (from step 1.3)

#### GOOGLE_CLIENT_SECRET
- **Key**: `GOOGLE_CLIENT_SECRET`
- **Value**: Your Google Client Secret (from step 1.3)

#### GOOGLE_CALLBACK_URL
- **Key**: `GOOGLE_CALLBACK_URL`
- **Value**: `https://contractorcrm-api.onrender.com/auth/google/callback`

#### SESSION_SECRET
- **Key**: `SESSION_SECRET`
- **Value**: `contractor-crm-super-secret-session-key-2024`

### 2.3 Save and Deploy
1. Click **Save Changes**
2. Render will automatically redeploy your service
3. Wait for deployment to complete (3-7 minutes)

## Step 3: Test the Setup

### 3.1 Test Auth Status
Visit: `https://contractorcrm-api.onrender.com/auth/status`
Should return: `{"authenticated": false}`

### 3.2 Test Google OAuth
Visit: `https://contractorcrm-api.onrender.com/auth/google`
Should redirect to Google OAuth

### 3.3 Test Frontend
Visit: `https://contractor-crm.vercel.app/login`
Click "התחבר עם Google" - should work without errors

## Troubleshooting

### Common Issues:

1. **"Cannot GET /auth/google"**
   - Check if environment variables are set correctly
   - Verify the service is deployed successfully

2. **"Invalid redirect URI"**
   - Make sure the redirect URI in Google Console matches exactly:
   - `https://contractorcrm-api.onrender.com/auth/google/callback`

3. **"Client ID not found"**
   - Verify GOOGLE_CLIENT_ID is set correctly
   - Check for typos in the environment variable

4. **"Client Secret invalid"**
   - Verify GOOGLE_CLIENT_SECRET is set correctly
   - Make sure there are no extra spaces

### Debug Steps:
1. Check Render logs for errors
2. Verify environment variables are set
3. Test the auth endpoints directly
4. Check Google Console for any restrictions

## Security Notes

- Never commit credentials to Git
- Use strong session secrets in production
- Regularly rotate your OAuth credentials
- Monitor usage in Google Console
