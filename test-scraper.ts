import { WebmotorsScraper } from './server/scrapers/sources/webmotorsScraper.js';
import { OlxScraper } from './server/scrapers/sources/olxScraper.js';
import fs from 'fs';

async function test() {
    const olx = new OlxScraper({
        name: 'OLX',
        source: 'olx',
        baseUrl: 'https://www.olx.com.br',
        enabled: true,
        minDelayMs: 1000,
        maxDelayMs: 2000,
        timeout: 15000,
        maxRetries: 1,
        respectRobotsTxt: false
    });

    console.log("Testing OLX:");
    try {
        const url = olx['buildSearchUrl']({ minYear: "2020", maxPrice: "50000" });
        const html = await olx['fetchWithRetry'](url, { visibleBrowser: true });
        fs.writeFileSync('olx.html', html);
        const olxRes = olx['parseAds'](html, {});
        console.log("OLX Ads found in HTML:", olxRes.length);
    } catch (e) {
        console.error("OLX Error:", e.message);
    }

    const wm = new WebmotorsScraper({
        name: 'Webmotors',
        source: 'webmotors',
        baseUrl: 'https://www.webmotors.com.br',
        enabled: true,
        minDelayMs: 1000,
        maxDelayMs: 2000,
        timeout: 15000,
        maxRetries: 1,
        respectRobotsTxt: false
    });

    console.log("\nTesting Webmotors:");
    try {
        const url = wm['buildSearchUrl']({ minYear: "2020", maxPrice: "50000" });
        const html = await wm['fetchWithRetry'](url, { visibleBrowser: true });
        fs.writeFileSync('webmotors.html', html);
        const wmRes = wm['parseAds'](html, {});
        console.log("Webmotors Ads found in HTML:", wmRes.length);
    } catch (e) {
        console.error("Webmotors Error:", e.message);
    }
}

test();
