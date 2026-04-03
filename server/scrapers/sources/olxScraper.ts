import { BaseScraper, ScraperConfig, ScrapedVehicleAd } from "../baseScraper";
import * as cheerio from "cheerio";

/**
 * OLX Scraper
 * Handles scraping of vehicle ads from OLX.com.br with real HTML parsing
 */
export class OlxScraper extends BaseScraper {
  constructor(config: ScraperConfig) {
    super(config);
  }

  async search(criteria: Record<string, any>): Promise<ScrapedVehicleAd[]> {
    try {
      const deepScrape = criteria.deepScrape !== false; // default: true
      const maxDeep = criteria.maxDeepScrape ?? 10;

      const searchUrl = this.buildSearchUrl(criteria);
      const html = await this.fetchWithRetry(searchUrl, { visibleBrowser: criteria.visibleBrowser });
      let ads = this.parseAds(html, criteria);
      if (criteria.maxAds) {
        ads = ads.slice(0, criteria.maxAds);
      }

      if (deepScrape && ads.length > 0) {
        const slice = ads.slice(0, Math.min(maxDeep, ads.length));
        console.log(`[OLX] Deep scraping ${slice.length}/${ads.length} ads for price/contact...`);
        for (let i = 0; i < slice.length; i++) {
          const ad = ads[i];
          try {
            console.log(`[OLX] Deep scraping ${i + 1}/${ads.length}: ${ad.url}`);
            const { contactInfo, price } = await this.runInBrowser(ad.url, async (page) => {
              await page.waitForLoadState('domcontentloaded');
              await page.waitForLoadState('networkidle').catch(() => {});
              await this.humanLikeDelay(1800, 3200);

              // Pequeno scroll para simular humano e carregar lazy content
              await page.mouse.wheel(0, 600).catch(() => {});
              await this.humanLikeDelay(800, 1400);

              // Try to find and click the contact button
              const btnRegex = /(Ver n.meros|Ver os n.meros|Ver telefone|Mostrar telefone|Contato|Falar com vendedor)/i;
              const button = await page.getByRole('button', { name: btnRegex }).first().catch(() => null)
                || await page.getByText(btnRegex).first().catch(() => null);

              if (button) {
                await button.click().catch((e: any) => console.log('Button click err:', e.message));
                await this.humanLikeDelay(2000, 4000); // Wait for the number to reveal
              }

              const pageHtml = await page.content();
              let phone = BaseScraper.extractPhoneNumbers(pageHtml);
              if (!phone) {
                // tel: links
                const telHref = await page.locator('a[href^="tel:"]').first().getAttribute('href').catch(() => "");
                phone = BaseScraper.extractPhoneNumbers(telHref || "");
              }
              if (!phone) {
                const modalText = await page.locator('text=/\\(?\\d{2}\\)?\\s?9?\\d{4}[\\s-]?\\d{4}/').first().textContent().catch(() => "");
                phone = BaseScraper.extractPhoneNumbers(modalText || "");
              }

              // Robust price extraction on the ad page
              let priceText = await page.locator("[data-testid='ad-price']").first().textContent().catch(() => "");
              if (!priceText) priceText = await page.locator("span:has-text('R$')").first().textContent().catch(() => "");
              if (!priceText) priceText = (pageHtml.match(/R\$\s?[\d\.\s]+,\d{2}/) || [])[0] || "";
              const cleanPrice = this.extractPrice(priceText);

              return { contactInfo: phone, price: cleanPrice };
            }, {
              visibleBrowser: criteria.visibleBrowser,
              userAgent: "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
              viewport: { width: 412, height: 915 },
            });

            if (contactInfo) {
              ad.contactInfo = contactInfo;
            }
            if (!ad.price && price) {
              ad.price = price;
            }
          } catch (e) {
            console.error(`[OLX] Failed to deep scrape ${ad.url}`);
          }
        }
      }

      console.log(`[OLX] Found ${ads.length} ads`);
      return ads;
    } catch (error) {
      console.error("[OLX] Scraper error:", error);
      return [];
    }
  }

  private buildSearchUrl(criteria: Record<string, any>): string {
    const params = new URLSearchParams();

    // OLX uses specific URL structure
    let url = "/autos-e-pecas/carros-vans-e-utilitarios";

    if (criteria.state) {
      params.append("state", criteria.state);
    }
    if (criteria.city) {
      params.append("city", criteria.city);
    }
    if (criteria.minPrice) {
      params.append("minPrice", criteria.minPrice);
    }
    if (criteria.maxPrice) {
      params.append("maxPrice", criteria.maxPrice);
    }
    if (criteria.minYear) {
      params.append("minYear", criteria.minYear);
    }
    if (criteria.maxYear) {
      params.append("maxYear", criteria.maxYear);
    }
    if (criteria.minMileage) {
      params.append("minMileage", criteria.minMileage);
    }
    if (criteria.maxMileage) {
      params.append("maxMileage", criteria.maxMileage);
    }

    if (criteria.brand || criteria.model || criteria.color) {
      const parts = [];
      if (criteria.brand) parts.push(criteria.brand);
      if (criteria.model) parts.push(criteria.model);
      if (criteria.color) parts.push(criteria.color);

      // If brand and model are present, make sure they are combined in 'q' for better precision
      params.append("q", parts.join(" "));
    }

    const queryString = params.toString();
    const finalPath = queryString ? `${url}?${queryString}` : url;
    return `${this.config.baseUrl}${finalPath}`;
  }

  private parseAds(html: string, criteria: Record<string, any>): ScrapedVehicleAd[] {
    const ads: ScrapedVehicleAd[] = [];

    try {
      const $ = cheerio.load(html);

      // OLX ad list structure (dynamic selectors)
      $("a.olx-adcard__link, a[data-testid='adcard-link']").each((_, element) => {
        try {
          const $element = $(element);

          // Extract ad ID from URL
          const url = $element.attr("href") || "";
          const externalId = this.extractIdFromUrl(url);

          if (!externalId) return; // Skip if can't extract ID

          // Extract title
          const title = $element.find("h2").text() || $element.attr("title") || "";

          // The text is inside the parent card wrapper
          const cardParent = $element.closest('.olx-adcard__topbody, section, li');
          const fullText = cardParent.text() || $element.text();

          // Extract price with multiple fallbacks
          let priceText = $element.find('.olx-adcard__price, [aria-label*="Preço"], [data-testid=\"ad-price\"]').text() || "";
          if (!priceText) priceText = cardParent.find('h3').text() || "";
          if (!priceText) priceText = cardParent.find('*:contains(\"R$\")').last().text() || "";
          if (!priceText) {
            const ldjson =
              cardParent.find('script[type=\"application/ld+json\"]').html() ||
              $element.find('script[type=\"application/ld+json\"]').html();
            if (ldjson) {
              try {
                const data = JSON.parse(ldjson);
                if (data?.offers?.price) priceText = String(data.offers.price);
              } catch {}
            }
          }
          const price = this.extractPrice(priceText);

          // Extract location (naive matching for now)
          let locationText = $element.find('.olx-adcard__location, .olx-adcard__location-line-1, p[aria-label*="Localização"]').text() || "";
          if (!locationText) locationText = cardParent.find('[aria-label*="Localização"]').attr('aria-label') || "";
          const { city, state } = this.parseLocation(locationText);

          // Extract mileage
          const mileageNode = cardParent.find('[aria-label*="quilômetros"]');
          let mileageText = $element.find('[aria-label*="quilômetros"]').attr('aria-label') || $element.find('.olx-adcard__mileage').text() || "";
          if (!mileageText) mileageText = mileageNode.attr('aria-label') || cardParent.find('*:contains(" km")').last().text() || fullText;
          const mileage = this.extractMileage(mileageText);

          // Extract year
          const yearNode = cardParent.find('[aria-label*="Ano"]');
          let yearText = $element.find('[aria-label*="Ano"]').attr('aria-label') || $element.find('.olx-adcard__year').text() || "";
          if (!yearText) yearText = yearNode.attr('aria-label') || fullText;
          let year = 0;
          const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
          if (yearMatch) year = parseInt(yearMatch[0], 10);

          // Extract seller type
          const sellerType = this.extractSellerType($element);

          // Extract photo count and URLs
          const photoCount = $element.find("img").length || 0;

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

          // Extract description/details
          const description =
            $element.find(".olx-adcard__description, .description, .ad-description").text() || "";

          // Extract posted date
          const dateText = $element.find(".date, [data-testid='ad-date']").text() || "";
          const adPostedAt = this.parseDate(dateText);

          // Extract real brand and model from title
          const { brand: realBrand, model: realModel } = BaseScraper.extractBrandAndModel(title);

          const ad: ScrapedVehicleAd = {
            externalId,
            source: this.config.source,
            url: url.startsWith("http") ? url : `${this.config.baseUrl}${url}`,
            title: title.trim(),
            brand: realBrand || criteria.brand,
            model: realModel || criteria.model,
            color: criteria.color,
            year,
            mileage,
            price,
            city: city || criteria.city,
            state: state || criteria.state,
            sellerType,
            description: description.trim(),
            photoCount: photoUrls ? photoUrls.length : 0,
            photoUrls,
            adPostedAt,
          };

          ads.push(ad);
        } catch (error) {
          console.error("[OLX] Error parsing individual ad:", error);
        }
      });

      return ads;
    } catch (error) {
      console.error("[OLX] Error parsing HTML:", error);
      return [];
    }
  }

  private extractIdFromUrl(url: string): string {
    // Extract ID from OLX URL: usually a long number at the end after a hyphen or slash
    const match = url.match(/[/-](\d+)(?:[?#]|$)/);
    return match ? match[1] : "";
  }

  private extractPrice(priceText: string): number | undefined {
    // Extract price from text like "R$ 35.000" or "35000"
    const match = priceText.match(/[\d.]+/g);
    if (match) {
      const parsed = parseInt(match.join("").replace(/\./g, ""), 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private parseLocation(locationText: string): { city: string; state: string } {
    // Parse location like "São Paulo, SP" or "SP"
    const parts = locationText.split(",").map((p) => p.trim());
    return {
      city: parts[0] || "",
      state: parts[1] || "",
    };
  }

  private extractMileage(mileageText: string): number | undefined {
    const match = mileageText.match(/(\d+)\s*(?:km|quilômetro)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractYear(yearText: string): number | undefined {
    const match = yearText.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0], 10) : undefined;
  }

  private extractBrandModel(title: string): { brand?: string; model?: string } {
    // Common Brazilian car brands
    const brands = [
      "Fiat",
      "Chevrolet",
      "Ford",
      "Volkswagen",
      "Hyundai",
      "Kia",
      "Toyota",
      "Honda",
      "Nissan",
      "Renault",
      "Peugeot",
      "Citroën",
      "BMW",
      "Audi",
      "Mercedes",
      "Jeep",
      "Mitsubishi",
      "Suzuki",
    ];

    const titleLower = title.toLowerCase();
    let brand: string | undefined;

    for (const b of brands) {
      if (titleLower.includes(b.toLowerCase())) {
        brand = b;
        break;
      }
    }

    // Extract model (usually second word after brand)
    let model: string | undefined;
    if (brand) {
      const parts = title.split(/\s+/);
      const brandIndex = parts.findIndex(
        (p) => p.toLowerCase() === brand!.toLowerCase()
      );
      if (brandIndex !== -1 && brandIndex + 1 < parts.length) {
        model = parts[brandIndex + 1];
      }
    }

    return { brand, model };
  }

  private extractSellerType(
    $element: any
  ): "individual" | "dealer" | "reseller" | undefined {
    const sellerText = $element.find(".seller-type, .badge").text().toLowerCase();

    if (sellerText.includes("loja") || sellerText.includes("concession")) {
      return "dealer";
    }
    if (sellerText.includes("revenda")) {
      return "reseller";
    }
    if (sellerText.includes("particular")) {
      return "individual";
    }

    return undefined;
  }

  private parseDate(dateText: string): Date | undefined {
    // Parse relative dates like "1 hora atrás", "2 dias atrás"
    // or absolute dates like "15 de março"

    if (!dateText) return undefined;

    const now = new Date();
    const lower = dateText.toLowerCase();

    // Relative dates
    if (lower.includes("hora")) {
      const match = lower.match(/(\d+)\s*hora/);
      if (match) {
        const hours = parseInt(match[1], 10);
        return new Date(now.getTime() - hours * 60 * 60 * 1000);
      }
    }

    if (lower.includes("dia")) {
      const match = lower.match(/(\d+)\s*dia/);
      if (match) {
        const days = parseInt(match[1], 10);
        return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }
    }

    if (lower.includes("semana")) {
      const match = lower.match(/(\d+)\s*semana/);
      if (match) {
        const weeks = parseInt(match[1], 10);
        return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
      }
    }

    if (lower.includes("mês")) {
      const match = lower.match(/(\d+)\s*mês/);
      if (match) {
        const months = parseInt(match[1], 10);
        return new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);
      }
    }

    return undefined;
  }
}
