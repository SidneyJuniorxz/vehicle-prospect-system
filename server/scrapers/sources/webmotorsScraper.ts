import { BaseScraper, ScraperConfig, ScrapedVehicleAd } from "../baseScraper";
import * as cheerio from "cheerio";

/**
 * Webmotors Scraper
 * Handles scraping of vehicle ads from Webmotors with real HTML parsing
 */
export class WebmotorsScraper extends BaseScraper {
  constructor(config: ScraperConfig) {
    super(config);
  }

  async search(criteria: Record<string, any>): Promise<ScrapedVehicleAd[]> {
    try {
      if (criteria.directUrl) {
        const ad: ScrapedVehicleAd = {
          externalId: this.extractIdFromUrl(criteria.directUrl),
          source: this.config.source,
          url: criteria.directUrl,
          title: "Direct URL",
        };
        await this.deepScrapeAds([ad], criteria);
        return [ad];
      }

      const deepScrape = criteria.deepScrape !== false; // default true
      const maxDeep = criteria.maxDeepScrape ?? 8;

      const searchUrl = this.buildSearchUrl(criteria);
      const html = await this.fetchWithRetry(searchUrl, { visibleBrowser: criteria.visibleBrowser });
      let ads = this.parseAds(html, criteria);
      if (criteria.maxAds) {
        ads = ads.slice(0, criteria.maxAds);
      }
      if (criteria.sellerType) {
        ads = ads.filter((a) => a.sellerType === criteria.sellerType);
      }

      if (deepScrape && ads.length > 0) {
        const slice = ads.slice(0, Math.min(maxDeep, ads.length));
        await this.deepScrapeAds(slice, criteria);
      }

      console.log(`[Webmotors] Found ${ads.length} ads`);
      return ads;
    } catch (error) {
      console.error("[Webmotors] Scraper error:", error);
      return [];
    }
  }

  private async deepScrapeAds(ads: ScrapedVehicleAd[], criteria: any) {
    console.log(`[Webmotors] Deep scraping ${ads.length} ads for contacts...`);
    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      try {
        console.log(`[Webmotors] Deep scraping ${i + 1}/${ads.length}: ${ad.url}`);
        const contactInfo = await this.runInBrowser(ad.url, async (page) => {
          await page.waitForLoadState('domcontentloaded');
          await page.waitForLoadState('networkidle').catch(() => {});
          await this.humanLikeDelay(criteria.quickScrape ? 600 : 1800, criteria.quickScrape ? 1200 : 3200);

          // Scroll para acionar lazy/modais
          await page.mouse.wheel(0, 800).catch(() => {});
          await this.humanLikeDelay(800, 1400);

          // Try to find and click the contact button on Webmotors
          const btnRegex = /(Ver telefone|Telefone|WhatsApp|Mensagem|Mostrar telefone)/i;
          const button = await page.getByRole('button', { name: btnRegex }).first().catch(() => null)
            || await page.getByText(btnRegex).first().catch(() => null);

          if (button) {
            await button.click().catch((e: any) => console.log('Button click err:', e.message));
            await this.humanLikeDelay(2000, 4000); // Wait for number/modal to reveal
          }

          const pageHtml = await page.content();
          let phone = BaseScraper.extractPhoneNumbers(pageHtml);
          if (!phone) {
            const telHref = await page.locator('a[href^=\"tel:\"]').first().getAttribute('href').catch(() => "");
            phone = BaseScraper.extractPhoneNumbers(telHref || "");
          }
          if (!phone) {
            const modalText = await page.locator('text=/\\(?\\d{2}\\)?\\s?9?\\d{4}[\\s-]?\\d{4}/').first().textContent().catch(() => "");
            phone = BaseScraper.extractPhoneNumbers(modalText || "");
          }
          // Price on detail page
          let priceText =
            (await page.locator('[data-testid=\"vehicle-info-price\"]').first().textContent().catch(() => "")) ||
            (await page.locator('[data-testid*=\"price\"]').first().textContent().catch(() => "")) ||
            (await page.locator('span:has-text(\"R$\")').first().textContent().catch(() => ""));
          if (!priceText) {
            const match = pageHtml.match(/R\\$\\s?[\\d\\.\\s]+,\\d{2}/);
            priceText = match ? match[0] : "";
          }
          if (!ad.price) {
            ad.price = this.extractPrice(priceText) || ad.price;
          }
          return phone;
        }, {
          visibleBrowser: criteria.visibleBrowser,
          userAgent: "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          viewport: { width: 412, height: 915 },
          fast: criteria.quickScrape,
          timeoutMs: 20000,
        });

        if (contactInfo) {
          ad.contactInfo = contactInfo;
        }
      } catch (e) {
        console.error(`[Webmotors] Failed to deep scrape ${ad.url}`);
      }
    }
  }

  private buildSearchUrl(criteria: Record<string, any>): string {
    // Brand and Model based friendly URL
    if (criteria.brand && criteria.model) {
      const brand = criteria.brand.toLowerCase().replace(/\s+/g, '-');
      const model = criteria.model.toLowerCase().replace(/\s+/g, '-');
      const state = criteria.state ? criteria.state.toLowerCase() : "";
      return `https://www.webmotors.com.br/carros-venda/${brand}/${model}${state ? `/sp` : ""}`;
    }

    const params = new URLSearchParams();
    if (criteria.state) params.append("estado", criteria.state);
    if (criteria.minPrice) params.append("precoMinimo", criteria.minPrice);
    if (criteria.maxPrice) params.append("precoMaximo", criteria.maxPrice);
    if (criteria.minYear) params.append("anoMinimo", criteria.minYear);
    if (criteria.maxYear) params.append("anoMaximo", criteria.maxYear);

    const queryParts = [];
    if (criteria.brand) queryParts.push(criteria.brand);
    if (criteria.model) queryParts.push(criteria.model);
    if (queryParts.length > 0) {
      params.append("busca", queryParts.join(" "));
    }

    return `${this.config.baseUrl}/busca?${params.toString()}`;
  }

  private parseAds(html: string, criteria: Record<string, any>): ScrapedVehicleAd[] {
    const ads: ScrapedVehicleAd[] = [];

    try {
      const $ = cheerio.load(html);

      // Webmotors dynamic hash classes traversal
      $("div[class*='_Card_'], div[class*='Card_'], .ContainerCard").each(
        (_, element) => {
          try {
            const $element = $(element);

            // Extract ad link
            const adLink = $element.find("a[href*='/comprar/']").first();
            const href = adLink.attr("href") || "";
            const url = href.startsWith('http') ? href : `${this.config.baseUrl}${href}`;
            const externalId = this.extractIdFromUrl(url);

            if (!externalId) return;

            // Extract title
            const titleText = $element.find("h2, h3, .TitleCard").text() || adLink.text() || "";
            const title = titleText.replace("Ver parcelas", "").trim();

            // Extract price using string search
            const priceText = $element.find('*:contains("R$")').last().text() || "";
            const price = this.extractPrice(priceText);

            // Extract year (typically 2020/2021)
            const infoText = $element.text();
            let yearInfos = { min: 0, max: 0 };
            const yearMatch = infoText.match(/(19|20)\d{2}\s*\/\s*(19|20)\d{2}/);
            if (yearMatch) {
              const parts = yearMatch[0].split('/');
              yearInfos = { min: parseInt(parts[0].trim(), 10), max: 0 };
            } else {
              const singleYearMatch = infoText.match(/\b(201\d|202\d)\b/);
              if (singleYearMatch) {
                yearInfos = { min: parseInt(singleYearMatch[1], 10), max: 0 };
              }
            }

            // Extract mileage
            const mileageText = $element.find('*:contains("km")').last().text() || "";
            const mileageString = mileageText.replace(/\D/g, "");
            const mileage = mileageString ? parseInt(mileageString, 10) : 0;

            const city = "Sem local";
            const state = "";

            // Photos
            let photoUrls: string[] | undefined;
            if (criteria.includeImages) {
              photoUrls = [];
              $element.find("img").each((_, imgEl) => {
                const src = $(imgEl).attr("src") || $(imgEl).attr("data-src") || $(imgEl).attr("srcset");
                if (src && typeof src === 'string') {
                  const cleanSrc = src.split(' ')[0];
                  if (cleanSrc.startsWith('http')) {
                    photoUrls!.push(cleanSrc);
                  }
                }
              });
            }

            // Extract real brand and model from title
            const { brand: realBrand, model: realModel } = BaseScraper.extractBrandAndModel(title);

            const ad: ScrapedVehicleAd = {
              externalId,
              source: this.config.source,
              url,
              title: title.trim(),
              brand: realBrand || criteria.brand,
              model: realModel || criteria.model,
              color: criteria.color,
              year: yearInfos.min || undefined,
              mileage,
              price,
              city: city || criteria.city,
              state: state || criteria.state,
              sellerType: "dealer",
              description: title,
              photoCount: photoUrls ? photoUrls.length : 0,
              photoUrls,
            };

            ads.push(ad);
          } catch (error) {
            console.error("[Webmotors] Error parsing individual ad:", error);
          }
        }
      );

      return ads;
    } catch (error) {
      console.error("[Webmotors] Error parsing HTML:", error);
      return [];
    }
  }

  private extractIdFromUrl(url: string): string {
    const match = url.match(/\/(\d+)(?:[?#]|$)/);
    return match ? match[1] : "";
  }

  private extractPrice(priceText: string): number | undefined {
    const match = priceText.match(/[\d.]+(?:,\d+)?/);
    if (match) {
      const p = match[0].replace(/\./g, "").replace(",", ".");
      const num = parseFloat(p);
      return !isNaN(num) ? num : undefined;
    }
    return undefined;
  }
}
