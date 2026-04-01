import fs from "fs";
import path from "path";
import { ScraperRegistry } from "../server/scrapers/scraperRegistry";

type Criteria = Record<string, any>;

async function main() {
  const registry = new ScraperRegistry();

  const criteria: Criteria = {
    state: "SP",
    minYear: 2015,
    maxYear: 2022,
    minPrice: 30000,
    maxPrice: 120000,
    deepScrape: true,
    maxDeepScrape: 8,
    visibleBrowser: false,
  };

  console.log("Iniciando coleta amostral com critérios:", criteria);

  const start = Date.now();
  const ads = await registry.searchAll(criteria);
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
