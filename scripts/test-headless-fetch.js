const { fetchWithHeadless } = require('../server/services/headlessFetcher');

async function main() {
    const url = process.argv[2] || 'https://www.yanush.co.il/';
    console.log('Testing headless fetch for:', url);
    try {
        const { html } = await fetchWithHeadless(url);
        const textLen = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
        console.log('HTML length:', (html || '').length);
        console.log('Text length:', textLen);
        console.log('Sample:', (html || '').slice(0, 300));
    } catch (e) {
        console.error('Headless fetch failed:', e?.message || e);
        process.exit(1);
    }
}

main();









