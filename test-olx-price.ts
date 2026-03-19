import { chromium } from "playwright";

async function run() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    });
    const page = await context.newPage();

    console.log("Navigating to OLX...");
    await page.goto("https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-ba/grande-salvador?q=ford%20ka", {
        waitUntil: "domcontentloaded",
    });

    console.log("Waiting for ads to load...");
    await page.waitForTimeout(5000);

    const ads = await page.$$("script[type='application/ld+json']");
    console.log(`Found ${ads.length} ld+json scripts`);

    // Also dump HTML of a full card
    const cards = await page.$$("section.olx-adcard");
    console.log(`Found ${cards.length} cards`);

    for (let i = 0; i < Math.min(2, cards.length); i++) {
        const card = cards[i];
        const textContext = await card.textContent();
        const htmlContext = await card.innerHTML();
        console.log(`\n\n--- CARD ${i + 1} TEXT ---`);
        console.log(textContext);

        // Also try to find the price specifically
        const priceText = await card.$eval("h3", el => el.textContent).catch(() => "Not found");
        console.log(`[PRICE FOUND]: ${priceText}`);
    }

    await browser.close();
}

run().catch(console.error);
