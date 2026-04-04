import { chromium } from "playwright-extra";
// @ts-ignore
import stealth from "puppeteer-extra-plugin-stealth";
import { Client } from "pg";
import { BaseScraper } from "../server/scrapers/baseScraper";

chromium.use(stealth());

type AdRow = {
  id: number;
  source: string;
  url: string;
};

async function run() {
  const batchSize = parseInt(process.env.BATCH_SIZE || "5", 10);
  const timeoutMs = parseInt(process.env.TIMEOUT_MS || "60000", 10);
  const headless = process.env.HEADFUL !== "true";

  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres:4263@localhost:5432/vehicle_prospect",
  });
  await client.connect();

  const { rows } = await client.query<AdRow>(
    `
    select id, source, url
    from vehicle_ads
    where (contact_info is null or contact_info = '')
      or price is null
    and source in ('olx','webmotors')
    order by id desc
    limit $1;
  `,
    [batchSize]
  );

  console.log(`Processando ${rows.length} anúncios...`);

  for (const row of rows) {
    const result = await scrapeSingle(row.url, headless, timeoutMs);
    console.log(`ID ${row.id} =>`, result);

    await client.query(
      `
      update vehicle_ads
      set contact_info = coalesce($1, contact_info),
          price = coalesce($2, price),
          updated_at = now()
      where id = $3;
    `,
      [result.contactInfo, result.price, row.id]
    );
  }

  await client.end();
}

async function scrapeSingle(url: string, headless: boolean, timeoutMs: number) {
  const browser = await chromium.launch({
    headless,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    viewport: { width: 412, height: 915 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.setDefaultNavigationTimeout(timeoutMs);

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, 800).catch(() => {});
  await page.waitForTimeout(800);

  let phone: string | undefined;
  let priceText = "";

  if (url.includes("olx")) {
    const btnRegex =
      /(Ver n.meros|Ver os n.meros|Ver telefone|Mostrar telefone|Contato|Falar com vendedor)/i;
    try {
      await page.getByRole("button", { name: btnRegex }).first().click({ timeout: 3000 });
    } catch {
      try {
        await page.getByText(btnRegex).first().click({ timeout: 3000 });
      } catch {}
    }
    await page.waitForTimeout(2000);
    const html = await page.content();
    phone =
      BaseScraper.extractPhoneNumbers(html) ||
      BaseScraper.extractPhoneNumbers(await page.locator('a[href^="tel:"]').first().getAttribute("href").catch(() => "") || "");
    priceText =
      (await page.locator("[data-testid='ad-price']").first().textContent().catch(() => "")) ||
      (await page.locator("span:has-text('R$')").first().textContent().catch(() => "")) ||
      (html.match(/R\$\s?[\d\.\s]+,\d{2}/) || [])[0] ||
      "";
  } else if (url.includes("webmotors")) {
    const btnRegex = /(Ver telefone|Telefone|WhatsApp|Mensagem|Mostrar telefone)/i;
    try {
      await page.getByRole("button", { name: btnRegex }).first().click({ timeout: 3000 });
    } catch {
      try {
        await page.getByText(btnRegex).first().click({ timeout: 3000 });
      } catch {}
    }
    await page.waitForTimeout(2000);
    const html = await page.content();
    phone =
      BaseScraper.extractPhoneNumbers(html) ||
      BaseScraper.extractPhoneNumbers(await page.locator('a[href^="tel:"]').first().getAttribute("href").catch(() => "") || "");
    priceText =
      (await page.locator('[data-testid="vehicle-info-price"]').first().textContent().catch(() => "")) ||
      (await page.locator('[data-testid*="price"]').first().textContent().catch(() => "")) ||
      (await page.locator('span:has-text("R$")').first().textContent().catch(() => "")) ||
      (html.match(/R\$\s?[\d\.\s]+,\d{2}/) || [])[0] ||
      "";
  }

  await browser.close();

  return {
    contactInfo: phone,
    price: priceText ? extractPrice(priceText) : undefined,
  };
}

function extractPrice(priceText: string): number | undefined {
  const match = priceText.match(/[\d.]+(?:,\d+)?/);
  if (match) {
    const p = match[0].replace(/\./g, "").replace(",", ".");
    const num = parseFloat(p);
    return !isNaN(num) ? num : undefined;
  }
  return undefined;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
