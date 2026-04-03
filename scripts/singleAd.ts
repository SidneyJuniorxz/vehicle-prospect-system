import { chromium } from "playwright-extra";
// @ts-ignore
import stealth from "puppeteer-extra-plugin-stealth";
import { BaseScraper } from "../server/scrapers/baseScraper";

chromium.use(stealth());

async function main() {
  const url = process.env.URL;
  if (!url) {
    console.error("Passe a URL do anúncio em URL=...");
    process.exit(1);
  }

  const headful = process.env.HEADFUL === "true";
  const userAgentMobile =
    "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

  console.log(`Abrindo ${url} (headful=${headful}, UA mobile)`);
  const browser = await chromium.launch({
    headless: !headful,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    userAgent: userAgentMobile,
    viewport: { width: 400, height: 800 },
  });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, 800).catch(() => {});
  await page.waitForTimeout(1200);

  const btnRegex = /(Ver n.meros|Ver os n.meros|Ver telefone|Mostrar telefone|Contato|Falar com vendedor)/i;
  const button = await page
    .getByRole("button", { name: btnRegex })
    .first()
    .catch(() => null)
    .then((b: any) => b || page.getByText(btnRegex).first().catch(() => null))
    .catch(() => null);

  if (button) {
    console.log("Botão de telefone encontrado, clicando...");
    await button.click().catch(() => {});
    await page.waitForTimeout(2500);
  } else {
    console.log("Botão de telefone não encontrado.");
  }

  const html = await page.content();
  const telHref = await page
    .locator('a[href^="tel:"]')
    .first()
    .getAttribute("href")
    .catch(() => "");
  const phone =
    BaseScraper.extractPhoneNumbers(telHref || "") || BaseScraper.extractPhoneNumbers(html || "");

  console.log("Telefone extraído:", phone || "não encontrado");

  // Preço
  let priceText =
    (await page.locator("[data-testid='ad-price']").first().textContent().catch(() => "")) ||
    (await page.locator("span:has-text('R$')").first().textContent().catch(() => ""));
  if (!priceText) {
    const match = html.match(/R\$\s?[\d\.\s]+,\d{2}/);
    priceText = match ? match[0] : "";
  }
  console.log("Preço (texto):", priceText || "não encontrado");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
