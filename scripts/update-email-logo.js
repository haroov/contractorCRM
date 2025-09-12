const fs = require('fs');
const path = require('path');

function updateEmailLogo() {
  try {
    console.log('🔄 Updating email logo in auth.js...');
    
    // Read the base64 logo
    const base64Path = path.join(__dirname, '../src/assets/logo-base64.txt');
    if (!fs.existsSync(base64Path)) {
      console.error('❌ Base64 logo file not found. Run convert-logo.js first.');
      return;
    }
    
    const base64Data = fs.readFileSync(base64Path, 'utf8').trim();
    
    // Read the auth.js file
    const authPath = path.join(__dirname, '../server/routes/auth.js');
    const authContent = fs.readFileSync(authPath, 'utf8');
    
    // Find and replace the logo in the email template
    const logoRegex = /src="data:image\/png;base64,[^"]+"/g;
    const newLogoTag = `src="${base64Data}"`;
    
    const updatedContent = authContent.replace(logoRegex, newLogoTag);
    
    // Write back to file
    fs.writeFileSync(authPath, updatedContent);
    
    console.log('✅ Email logo updated successfully!');
    console.log('📧 Base64 data length:', base64Data.length);
    
  } catch (error) {
    console.error('❌ Error updating email logo:', error);
  }
}

updateEmailLogo();
