console.log('🔍 בדיקת Environment Variables');
console.log('=====================================');
console.log('');

console.log('GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? '✅ מוגדר' : '❌ לא מוגדר');
console.log('GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? '✅ מוגדר' : '❌ לא מוגדר');
console.log('GMAIL_REDIRECT_URI:', process.env.GMAIL_REDIRECT_URI ? '✅ מוגדר' : '❌ לא מוגדר');
console.log('GMAIL_TOKEN:', process.env.GMAIL_TOKEN ? '✅ מוגדר' : '❌ לא מוגדר');
console.log('');

if (process.env.GMAIL_CLIENT_ID) {
    console.log('GMAIL_CLIENT_ID value:', process.env.GMAIL_CLIENT_ID);
}
if (process.env.GMAIL_CLIENT_SECRET) {
    console.log('GMAIL_CLIENT_SECRET value:', process.env.GMAIL_CLIENT_SECRET.substring(0, 10) + '...');
}
if (process.env.GMAIL_TOKEN) {
    try {
        const token = JSON.parse(process.env.GMAIL_TOKEN);
        console.log('GMAIL_TOKEN parsed successfully');
        console.log('Token type:', token.token_type);
        console.log('Token scope:', token.scope);
    } catch (error) {
        console.log('❌ GMAIL_TOKEN parsing error:', error.message);
    }
}

