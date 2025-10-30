const fetch = require('node-fetch');

async function testAnalyzerWithTimeout(url, timeoutMs = 10000) {
    console.log(`🧪 Testing analyzer with ${timeoutMs}ms timeout: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch('https://contractorcrm-api.onrender.com/api/company-analysis/analyze-company', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ website: url }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ HTTP ${response.status}: ${errorText}`);
            return null;
        }
        
        const result = await response.json();
        console.log(`✅ Success:`, result);
        return result;
        
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error(`⏰ Timeout after ${timeoutMs}ms`);
        } else {
            console.error(`🔥 Error:`, error.message);
        }
        return null;
    }
}

async function main() {
    const testUrls = [
        'https://www.example.com',
        'https://www.google.com',
        'https://www.yanush.co.il'
    ];
    
    for (const url of testUrls) {
        console.log(`\n--- Testing ${url} ---`);
        await testAnalyzerWithTimeout(url, 15000); // 15 second timeout
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
    }
}

main().catch(console.error);
