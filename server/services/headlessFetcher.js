const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 ContractorCRM/1.0';

let chromium;
try {
    chromium = require('playwright').chromium;
} catch (e) {
    chromium = null;
}

const MAX_CONCURRENT = Math.max(1, parseInt(process.env.HEADLESS_MAX_CONCURRENCY || '1', 10));
let running = 0;
const queue = [];

async function acquire() {
    if (running < MAX_CONCURRENT) {
        running++;
        return;
    }
    await new Promise(resolve => queue.push(resolve));
    running++;
}

function release() {
    running = Math.max(0, running - 1);
    const next = queue.shift();
    if (next) next();
}

async function clickCookieBanners(page) {
    const selectors = [
        '#onetrust-accept-btn-handler',
        '.ot-sdk-button',
        '.ot-sdk-container .accept-btn',
        '[data-cookiefirst-action="accept"]',
        '.cky-btn-accept',
        '#truste-consent-button',
        'button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
        '.qc-cmp2-summary-buttons .qc-cmp2-summary-buttons-accept',
    ];
    for (const s of selectors) {
        try {
            const el = await page.$(s);
            if (el) { await el.click({ timeout: 500 }).catch(() => { }); break; }
        } catch (_) { }
    }
    const texts = [
        'Accept', 'Agree', 'Allow', 'OK', 'Close', 'Continue', 'Consent', 'I Agree', 'I accept',
        'מאשר', 'מסכים', 'קבל', 'אישור', 'סגור', 'המשך', 'אני מסכים', 'הבנתי'
    ];
    try {
        const btns = await page.$$('button, a, [role="button"]');
        for (const b of btns) {
            let t = '';
            try { t = (await b.innerText()).trim(); } catch (_) { }
            if (!t) continue;
            if (texts.some(x => new RegExp(`^${x}$`, 'i').test(t))) {
                await b.click({ timeout: 500 }).catch(() => { });
                break;
            }
        }
    } catch (_) { }
}

module.exports.fetchWithHeadless = async function fetchWithHeadless(url) {
    if (!chromium) throw new Error('Playwright chromium not available');
    await acquire();
    const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
        const context = await browser.newContext({
            locale: 'he-IL',
            userAgent: UA,
            extraHTTPHeaders: {
                'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
            },
        });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        // Try to accept cookies quickly
        await clickCookieBanners(page);
        // Try within iframes as well
        try {
            for (const frame of page.frames()) {
                try { await clickCookieBanners(frame); } catch (_) { }
            }
        } catch (_) { }
        // Let page settle a bit
        await page.waitForTimeout(1200);
        // Try again (some banners re-render)
        await clickCookieBanners(page);
        // Scroll to trigger lazy loads
        try {
            await page.evaluate(async () => {
                await new Promise(r => {
                    let y = 0; const i = setInterval(() => { y += 600; window.scrollTo(0, y); if (y > document.body.scrollHeight) { clearInterval(i); r(); } }, 120);
                });
            });
        } catch (_) { }
        // Wait for network idle or max 3s
        try { await page.waitForLoadState('networkidle', { timeout: 3000 }); } catch (_) { }
        const html = await page.content();
        return { html: html || '' };
    } finally {
        await browser.close().catch(() => { });
        release();
    }
};


