import { chromium } from "playwright-extra";
// @ts-ignore
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";

chromium.use(stealth());

async function main() {
  const email = process.env.OLX_EMAIL;
  const password = process.env.OLX_PASSWORD;
  if (!email || !password) {
    console.error("Defina OLX_EMAIL e OLX_PASSWORD no ambiente.");
    process.exit(1);
  }

  const storagePath =
    process.env.OLX_STORAGE ||
    path.join(process.cwd(), ".wwebjs_auth", "olx_state.json");
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);

  console.log("Abrindo olx.com.br...");
  await page.goto("https://www.olx.com.br/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Aceitar cookies se aparecer
  const acceptBtn = await page
    .getByRole("button", { name: /Aceitar|Accept/i })
    .first()
    .catch(() => null);
  if (acceptBtn) {
    await acceptBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // Ir para login
  await page.goto("https://www.olx.com.br/account/?ref%5B%5D=home");
  await page.waitForTimeout(2000);

  // Form email/password (fluxo simples)
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password);
  const submit =
    (await page.getByRole("button", { name: /entrar|login|continuar/i }).first().catch(() => null)) ||
    (await page.locator('button[type="submit"]').first().catch(() => null));
  if (submit) {
    await submit.click().catch(() => {});
  }

  await page.waitForTimeout(4000); // aguarda redirecionar/logar

  // Salva storage
  const state = await page.context().storageState();
  fs.writeFileSync(storagePath, JSON.stringify(state, null, 2));
  console.log("Sessão OLX salva em", storagePath);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
