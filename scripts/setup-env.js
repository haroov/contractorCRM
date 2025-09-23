#!/usr/bin/env node

/**
 * Setup script for environment variables
 * Run with: node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnvironment() {
  console.log('🚀 Setting up environment variables for Contractor CRM\n');

  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('❌ Setup cancelled');
      rl.close();
      return;
    }
  }

  console.log('📝 Please provide the following information:\n');

  // Google Docs API Key
  const googleApiKey = await question('🔑 Google Docs API Key: ');
  if (!googleApiKey.trim()) {
    console.log('❌ Google Docs API Key is required');
    rl.close();
    return;
  }

  // MongoDB URI
  const mongoUri = await question('🗄️  MongoDB URI (press Enter for default): ');
  const mongoUriFinal = mongoUri.trim() || 'mongodb://localhost:27017/contractor-crm';

  // Session Secret
  const sessionSecret = await question('🔐 Session Secret (press Enter to generate): ');
  const sessionSecretFinal = sessionSecret.trim() || generateRandomString(32);

  // SendGrid API Key
  const sendGridKey = await question('📧 SendGrid API Key (press Enter to skip): ');

  // From Email
  const fromEmail = await question('📨 From Email (press Enter for default): ');
  const fromEmailFinal = fromEmail.trim() || 'noreply@chocoinsurance.com';

  // Port
  const port = await question('🌐 Server Port (press Enter for 3001): ');
  const portFinal = port.trim() || '3001';

  // Environment
  const nodeEnv = await question('🌍 Node Environment (development/production, press Enter for development): ');
  const nodeEnvFinal = nodeEnv.trim() || 'development';

  // Create .env content
  const envContent = `# Google Docs API Configuration
GOOGLE_API_KEY=${googleApiKey.trim()}

# MongoDB Configuration
MONGODB_URI=${mongoUriFinal}

# Session Configuration
SESSION_SECRET=${sessionSecretFinal}

# Email Configuration (SendGrid)
SENDGRID_API_KEY=${sendGridKey.trim()}
FROM_EMAIL=${fromEmailFinal}

# Server Configuration
PORT=${portFinal}
NODE_ENV=${nodeEnvFinal}

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:${portFinal}
VITE_AUTH_BASE_URL=http://localhost:${portFinal}
`;

  // Write .env file
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');

    // Create .env.example
    const envExampleContent = envContent.replace(/=.+$/gm, '=your_value_here');
    fs.writeFileSync(envExamplePath, envExampleContent);
    console.log('✅ .env.example file created successfully!');

    console.log('\n🎉 Environment setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the Google Docs API: node scripts/test-google-docs-api.js');
    console.log('2. Start the server: npm start');
    console.log('3. Check the terms page: http://localhost:3001/termsOfUse');

  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }

  rl.close();
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Run the setup
setupEnvironment().catch(console.error);
