import { BaseScraper, ScraperConfig, ScrapedVehicleAd } from "../baseScraper";
import * as cheerio from "cheerio";

/**
 * Mercado Livre Scraper
 * Handles scraping of vehicle ads from Mercado Livre with real HTML parsing
 */
export class MercadoLivreScraper extends BaseScraper {
  constructor(config: ScraperConfig) {
    super(config);
  }

  async search(criteria: Record<string, any>): Promise<ScrapedVehicleAd[]> {
    try {
      const searchUrl = this.buildSearchUrl(criteria);
      const html = await this.fetchWithRetry(searchUrl, { visibleBrowser: criteria.visibleBrowser });
      const ads = this.parseAds(html, criteria);

      console.log(`[Mercado Livre] Found ${ads.length} ads`);
      return ads;
    } catch (error) {
      console.error("[Mercado Livre] Scraper error:", error);
      return [];
    }
  }

  private buildSearchUrl(criteria: Record<string, any>): string {
    const params = new URLSearchParams();

    // Mercado Livre has multiple search URL patterns. 
    // The previous one was: https://www.mercadolivre.com.br/c/carros-motos-e-outros?category=MLB1743&q=...
    // The one that worked in browser: https://lista.mercadolivre.com.br/veiculos/[brand]/[model]/[state]/[brand]-[model]

    if (criteria.brand && criteria.model) {
      const brand = criteria.brand.toLowerCase().replace(/\s+/g, '-');
      const model = criteria.model.toLowerCase().replace(/\s+/g, '-');
      const state = criteria.state ? criteria.state.toLowerCase().replace(/\s+/g, '-') : "brasil";
      // This pattern is more robust for specific brand/model searches
      return `https://lista.mercadolivre.com.br/veiculos/${brand}/${model}/${state}/${brand}-${model}`;
    }

    params.append("category", "MLB1743");

    if (criteria.state) {
      params.append("state", criteria.state);
    }
    if (criteria.minPrice) {
      params.append("price", `${criteria.minPrice}-${criteria.maxPrice || ""}`);
    }
    if (criteria.minYear) {
      params.append("year_min", criteria.minYear);
    }

    // Fallback q parameter
    const queryParts = [];
    if (criteria.brand) queryParts.push(criteria.brand);
    if (criteria.model) queryParts.push(criteria.model);
    if (queryParts.length > 0) {
      params.append("q", queryParts.join(" "));
    }

    return `${this.config.baseUrl}/c/carros-motos-e-outros?${params.toString()}`;
  }

  private parseAds(html: string, criteria: Record<string, any>): ScrapedVehicleAd[] {
    const ads: ScrapedVehicleAd[] = [];

    try {
      const $ = cheerio.load(html);

      // Mercado Livre item structure (Old layout + New poly-card layout)
      $("div[data-component-type='s-search-result'], li.ui-search-layout__item, .poly-card").each(
        (_, element) => {
          try {
            const $element = $(element);

            // Extract ad link
            const adLink = $element.find("a.ui-search-link, a[href*='/MLB'], .poly-component__title a").first();
            const href = adLink.attr("href") || $element.find("a").first().attr("href") || "";
            const url = href.startsWith('http') ? href : `${this.config.baseUrl}${href}`;
            const externalId = this.extractIdFromUrl(url);

            if (!externalId) return;

            // Extract title
            const title = $element.find("h2, .ui-search-item__title, .poly-component__title").text() || "";

            // Extract price
            const priceText = $element.find(".price-tag, .ui-search-price__second-line, .poly-price__current").text() || "";
            const price = this.extractPrice(priceText);

            // Extract location
            const locationText = $element.find(".ui-search-item__location, .poly-component__location").text() || "";
            const { city, state } = this.parseLocation(locationText);

            // Extract condition (novo/usado) from attributes
            const attributesText = $element.find(".ui-search-card-attributes, .poly-attributes-list").text() || "";

            // Extract real brand and model from title
            const { brand: extractedBrand, model: extractedModel } = BaseScraper.extractBrandAndModel(title);

            // Extract seller type
            const sellerType = this.extractSellerType($element);

            // Extract photo count
            const photoCount = $element.find("img").length || 0;

            // Extract contact info if any in title or attributes
            const contactInfo = BaseScraper.extractPhoneNumbers(`${title} ${attributesText}`);

            const ad: ScrapedVehicleAd = {
              externalId,
              source: this.config.source,
              url,
              title: title.trim(),
              brand: extractedBrand || criteria.brand,
              model: extractedModel || criteria.model,
              price,
              city,
              state,
              sellerType,
              contactInfo,
              description: title, // Use title as base description if not available
              photoCount,
            };

            ads.push(ad);
          } catch (error) {
            console.error("[Mercado Livre] Error parsing individual ad:", error);
          }
        }
      );

      return ads;
    } catch (error) {
      console.error("[Mercado Livre] Error parsing HTML:", error);
      return [];
    }
  }

  private extractIdFromUrl(url: string): string {
    const match = url.match(/MLB(\d+)/);
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

  private parseLocation(locationText: string): { city: string; state: string } {
    const parts = locationText.split(",").map((p) => p.trim());
    return {
      city: parts[0] || "",
      state: parts[1] || "",
    };
  }

  private extractSellerType(
    $element: any
  ): "individual" | "dealer" | "reseller" | undefined {
    const sellerText = $element.find(".ui-search-item__seller, .poly-component__seller").text().toLowerCase();

    if (sellerText.includes("loja") || sellerText.includes("concession")) {
      return "dealer";
    }
    if (sellerText.includes("revenda")) {
      return "reseller";
    }

    return "individual";
  }
}
