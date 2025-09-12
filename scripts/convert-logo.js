const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertLogoSvgToPng() {
  try {
    console.log('🔄 Converting SVG logo to PNG...');
    
    const svgPath = path.join(__dirname, '../src/assets/logo.svg');
    const pngPath = path.join(__dirname, '../src/assets/logo.png');
    
    // Check if SVG file exists
    if (!fs.existsSync(svgPath)) {
      console.error('❌ SVG file not found:', svgPath);
      return;
    }
    
    // Convert SVG to PNG with different sizes
    const sizes = [
      { size: 64, name: 'logo-64.png' },
      { size: 128, name: 'logo-128.png' },
      { size: 256, name: 'logo-256.png' },
      { size: 512, name: 'logo-512.png' }
    ];
    
    for (const { size, name } of sizes) {
      const outputPath = path.join(__dirname, '../src/assets/', name);
      
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Created ${name} (${size}x${size})`);
    }
    
    // Also create a base64 version for emails
    const base64Buffer = await sharp(svgPath)
      .resize(64, 64)
      .png()
      .toBuffer();
    
    const base64String = base64Buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64String}`;
    
    // Save base64 to file for easy copying
    const base64Path = path.join(__dirname, '../src/assets/logo-base64.txt');
    fs.writeFileSync(base64Path, dataUrl);
    
    console.log('✅ Created logo-base64.txt for email embedding');
    console.log('📧 Base64 data URL length:', dataUrl.length);
    
  } catch (error) {
    console.error('❌ Error converting logo:', error);
  }
}

convertLogoSvgToPng();
