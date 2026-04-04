import fs from "fs";
import path from "path";
import { ScraperRegistry } from "../server/scrapers/scraperRegistry";

type Criteria = Record<string, any>;

// Helpers to read env vars (PowerShell friendly)
function envList(name: string, fallback: string[] = []): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const registry = new ScraperRegistry();

  const sourcesFilter = envList("SOURCES"); // ex: olx,webmotors
  const maxAds = envInt("MAX_ADS", 20);
  const headful = process.env.HEADFUL === "true";
  const deep = process.env.DEEP !== "false";
  const maxDeep = envInt("MAX_DEEP", 3);
  const quickScrape = process.env.QUICK === "true";
  const directUrl = process.env.URL; // opcional: deep scrape direto em uma URL
  const sellerType = process.env.SELLER_TYPE; // opcional: "individual" | "dealer" | "reseller"
  const timeoutMs = envInt("TIMEOUT_MS", 60000);

  const criteria: Criteria = {
    state: "SP",
    minYear: 2015,
    maxYear: 2022,
    minPrice: 30000,
    maxPrice: 120000,
    deepScrape: deep,
    maxDeepScrape: maxDeep,
    visibleBrowser: headful,
    maxAds, // usado pelo registry para limitar por fonte
    quickScrape,
    timeoutMs,
    sellerType,
  };

  console.log("Iniciando coleta amostral com critérios:", criteria);
  if (sourcesFilter.length) {
    console.log("Filtrando fontes:", sourcesFilter.join(", "));
  }
  console.log(`MAX_ADS=${maxAds} HEADFUL=${headful}`);

  const start = Date.now();
  let ads: any[] = [];

  if (directUrl) {
    // Deep scrape direto em uma URL (fonte inferida por host)
    const source = directUrl.includes("olx")
      ? "olx"
      : directUrl.includes("webmotors")
      ? "webmotors"
      : "manual";
    // Força deep scrape headful e não-rápido para maximizar captura
    criteria.visibleBrowser = true;
    criteria.quickScrape = false;
    ads = [{ source, url: directUrl, title: "URL manual", directUrl: true }];
  } else {
    const allAds = await registry.searchAll(criteria);
    ads = allAds
      .filter((ad) => (sourcesFilter.length ? sourcesFilter.includes(ad.source) : true))
      .slice(0, maxAds);
  }

  // Se for URL direta, chamar deep scrape via scraper correspondente
  if (directUrl && ads.length === 1 && ads[0].source !== "manual") {
    const scraper = registry.getScraper(ads[0].source);
    if (scraper) {
      console.log(`Executando deep scrape direto na URL (${ads[0].source})...`);
      // Passa critério com flags de rápido/headful
      await (scraper as any).deepScrapeAds?.(ads, {
        visibleBrowser: headful,
        quickScrape,
        deepScrape: true,
        maxDeepScrape: 1,
      });
    }
  }

  const duration = (Date.now() - start) / 1000;

  const bySource = new Map<
    string,
    { total: number; withPrice: number; withContact: number }
  >();

  for (const ad of ads) {
    const entry = bySource.get(ad.source) || { total: 0, withPrice: 0, withContact: 0 };
    entry.total += 1;
    if (ad.price != null) entry.withPrice += 1;
    if (ad.contactInfo) entry.withContact += 1;
    bySource.set(ad.source, entry);
  }

  console.log("\nResumo por fonte:");
  for (const [source, v] of bySource.entries()) {
    console.log(
      `${source.padEnd(15)} total=${v.total} price=${v.withPrice} contact=${v.withContact}`
    );
  }
  console.log(`\nTempo total: ${duration.toFixed(1)}s\n`);

  const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const reportPath = path.join(process.cwd(), "reports", `run-${ts}.md`);
  const lines = [
    `# Coleta amostral ${ts}`,
    "",
    `Critérios: ${JSON.stringify(criteria)}`,
    "",
    "| Fonte | Total | Com preço | Com contato |",
    "| --- | ---: | ---: | ---: |",
    ...Array.from(bySource.entries()).map(
      ([source, v]) => `| ${source} | ${v.total} | ${v.withPrice} | ${v.withContact} |`
    ),
    "",
    `Tempo: ${duration.toFixed(1)}s`,
  ];
  fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n"), "utf-8");
  console.log(`Relatório salvo em ${reportPath}`);
}

main().catch((err) => {
  console.error("Erro na coleta amostral:", err);
  process.exit(1);
});
