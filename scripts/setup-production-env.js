const fs = require('fs');

console.log('🔧 הגדרת Environment Variables לפרודקשן');
console.log('===============================================');
console.log('');

// Read credentials and token files
const credentials = JSON.parse(fs.readFileSync('./server/credentials.json'));
const token = JSON.parse(fs.readFileSync('./server/token.json'));

console.log('📋 הוסף את המשתנים הבאים ל-Vercel Environment Variables:');
console.log('');

console.log('GMAIL_CLIENT_ID=' + credentials.installed.client_id);
console.log('GMAIL_CLIENT_SECRET=' + credentials.installed.client_secret);
console.log('GMAIL_REDIRECT_URI=' + credentials.installed.redirect_uris[0]);
console.log('GMAIL_TOKEN=' + JSON.stringify(token));
console.log('');

console.log('📝 הוראות:');
console.log('1. עבור ל-Vercel Dashboard');
console.log('2. בחר את הפרויקט contractor-crm');
console.log('3. לחץ על Settings > Environment Variables');
console.log('4. הוסף כל משתנה בנפרד');
console.log('5. לחץ Save ו-Redeploy');
console.log('');

console.log('💡 טיפ: העתק את הערכים למעלה והדבק אותם ב-Vercel!');

