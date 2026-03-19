import { getScraperRegistry } from './server/scrapers/scraperRegistry.js';

async function debugArgo() {
    const registry = getScraperRegistry();
    const criteria = {
        model: "Argo",
        state: "SP",
        maxPrice: "100000"
    };

    console.log("--- Debugging Argo Search ---");
    for (const scraper of registry.getEnabledScrapers()) {
        const url = (scraper as any).buildSearchUrl(criteria);
        console.log(`${scraper.getConfig().source} URL: ${url}`);
    }
}

debugArgo().catch(console.error);
