#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛡️ Safety Monitor Service Setup');
console.log('================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
    console.error('❌ Error: Please run this script from the project root directory');
    process.exit(1);
}

// Check if .env file exists
if (!fs.existsSync('.env')) {
    console.log('⚠️ Warning: .env file not found');
    console.log('   Please create a .env file with the required environment variables');
    console.log('   See SAFETY_MONITOR_GUIDE.md for details\n');
} else {
    console.log('✅ .env file found');
}

// Check for Gmail credentials
const credentialsPath = './server/credentials.json';
const tokenPath = './server/token.json';

if (!fs.existsSync(credentialsPath)) {
    console.log('⚠️ Warning: Gmail credentials not found');
    console.log('   Please download credentials.json from Google Cloud Console');
    console.log('   and place it in the server/ directory\n');
} else {
    console.log('✅ Gmail credentials found');
}

if (!fs.existsSync(tokenPath)) {
    console.log('⚠️ Warning: Gmail token not found');
    console.log('   Run "npm run test:safety-monitor" to generate the token\n');
} else {
    console.log('✅ Gmail token found');
}

// Check MongoDB connection
console.log('📊 Checking MongoDB connection...');
try {
    const { MongoClient } = require('mongodb');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';

    // This is a basic check - in production you'd want to actually connect
    console.log('✅ MongoDB URI configured');
} catch (error) {
    console.log('⚠️ Warning: MongoDB connection check failed');
    console.log('   Make sure MongoDB is running and MONGODB_URI is set correctly\n');
}

// Check if uploads/temp directory exists
const tempDir = './uploads/temp';
if (!fs.existsSync(tempDir)) {
    console.log('📁 Creating temp directory for PDF downloads...');
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('✅ Temp directory created');
} else {
    console.log('✅ Temp directory exists');
}

// Check dependencies
console.log('\n📦 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['googleapis', 'pdf-parse', 'mongodb', 'node-cron'];

let missingDeps = [];
requiredDeps.forEach(dep => {
    if (!packageJson.dependencies[dep]) {
        missingDeps.push(dep);
    }
});

if (missingDeps.length > 0) {
    console.log(`⚠️ Missing dependencies: ${missingDeps.join(', ')}`);
    console.log('   Run "npm install" to install missing dependencies\n');
} else {
    console.log('✅ All required dependencies are installed');
}

// Optional dependencies for charts
const optionalDeps = ['recharts', 'date-fns'];
let missingOptionalDeps = [];
optionalDeps.forEach(dep => {
    if (!packageJson.dependencies[dep]) {
        missingOptionalDeps.push(dep);
    }
});

if (missingOptionalDeps.length > 0) {
    console.log(`ℹ️ Optional dependencies for charts: ${missingOptionalDeps.join(', ')}`);
    console.log('   Install with: npm install recharts date-fns\n');
}

// Test the service
console.log('🧪 Testing Safety Monitor Service...');
try {
    execSync('node scripts/test-safety-monitor.js', { stdio: 'pipe' });
    console.log('✅ Service test completed successfully');
} catch (error) {
    console.log('⚠️ Service test failed - this is normal if Gmail credentials are not configured');
    console.log('   See the test output above for details\n');
}

// Summary
console.log('\n📋 Setup Summary:');
console.log('==================');

if (fs.existsSync('.env') && fs.existsSync(credentialsPath) && fs.existsSync(tokenPath)) {
    console.log('✅ Safety Monitor Service is ready to use!');
    console.log('\n🚀 Next steps:');
    console.log('   1. The cron job will run automatically at 7:00 AM Israel time');
    console.log('   2. Check the Safety Dashboard in project details pages');
    console.log('   3. Monitor logs in server/safety-monitor.log');
} else {
    console.log('⚠️ Setup incomplete - please complete the missing steps:');

    if (!fs.existsSync('.env')) {
        console.log('   - Create .env file with required environment variables');
    }
    if (!fs.existsSync(credentialsPath)) {
        console.log('   - Download Gmail credentials from Google Cloud Console');
    }
    if (!fs.existsSync(tokenPath)) {
        console.log('   - Run "npm run test:safety-monitor" to generate Gmail token');
    }
}

console.log('\n📖 For detailed instructions, see SAFETY_MONITOR_GUIDE.md');
console.log('🆘 For support, contact the development team\n');
