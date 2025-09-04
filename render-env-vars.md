# Environment Variables for Render

## Google OAuth Configuration

Add these environment variables to your Render service:

### 1. GOOGLE_CLIENT_ID
- **Value**: Your Google OAuth Client ID (from Google Cloud Console)
- **Example**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`

### 2. GOOGLE_CLIENT_SECRET
- **Value**: Your Google OAuth Client Secret (from Google Cloud Console)
- **Example**: `GOCSPX-abcdefghijklmnopqrstuvwxyz`

### 3. GOOGLE_CALLBACK_URL
- **Value**: `https://contractorcrm-api.onrender.com/auth/google/callback`
- **Note**: This should match the redirect URI in Google Cloud Console

### 4. SESSION_SECRET
- **Value**: `contractor-crm-super-secret-session-key-2024`
- **Note**: You can generate a random string for better security

## Steps to Add in Render:

1. Go to your Render service dashboard
2. Click on "Environment" tab
3. Click "Add Environment Variable"
4. Add each variable with its corresponding value
5. Click "Save Changes"
6. The service will automatically redeploy

## Security Notes:

- Never commit these values to Git
- Keep the Client Secret secure
- Use strong session secrets in production
- Regularly rotate your credentials
