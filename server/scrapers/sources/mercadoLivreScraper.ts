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
      const html = await this.fetchWithRetry(searchUrl);
      const ads = this.parseAds(html);

      console.log(`[Mercado Livre] Found ${ads.length} ads`);
      return ads;
    } catch (error) {
      console.error("[Mercado Livre] Scraper error:", error);
      return [];
    }
  }

  private buildSearchUrl(criteria: Record<string, any>): string {
    const params = new URLSearchParams();

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

    return `/c/carros-motos-e-outros?${params.toString()}`;
  }

  private parseAds(html: string): ScrapedVehicleAd[] {
    const ads: ScrapedVehicleAd[] = [];

    try {
      const $ = cheerio.load(html);

      // Mercado Livre item structure
      $("div[data-component-type='s-search-result'], li.ui-search-layout__item").each(
        (_, element) => {
          try {
            const $element = $(element);

            // Extract ad link
            const adLink = $element.find("a.ui-search-link, a[href*='/MLB']").first();
            const url = adLink.attr("href") || "";
            const externalId = this.extractIdFromUrl(url);

            if (!externalId) return;

            // Extract title
            const title = $element.find("h2, .ui-search-item__title").text() || "";

            // Extract price
            const priceText = $element.find(".price-tag, .ui-search-price__second-line").text() || "";
            const price = this.extractPrice(priceText);

            // Extract location
            const locationText = $element.find(".ui-search-item__location").text() || "";
            const { city, state } = this.parseLocation(locationText);

            // Extract condition (novo/usado)
            const condition = $element.find(".ui-search-item__condition").text() || "";
            const isNew = condition.toLowerCase().includes("novo");

            // Extract brand and model
            const { brand, model } = this.extractBrandModel(title);

            // Extract seller type
            const sellerType = this.extractSellerType($element);

            // Extract photo count
            const photoCount = $element.find("img").length || 0;

            // Extract description
            const description = title;

            const ad: ScrapedVehicleAd = {
              externalId,
              source: this.config.source,
              url: url.startsWith("http") ? url : `${this.config.baseUrl}${url}`,
              title: title.trim(),
              brand,
              model,
              price,
              city,
              state,
              sellerType,
              description,
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
    // Extract ID from Mercado Livre URL format: /MLB{id}
    const match = url.match(/MLB(\d+)/);
    return match ? match[1] : "";
  }

  private extractPrice(priceText: string): string {
    // Extract price from text like "R$ 35.000,00"
    const match = priceText.match(/[\d.]+(?:,\d+)?/);
    if (match) {
      return match[0].replace(/\./g, "").replace(",", "");
    }
    return "";
  }

  private parseLocation(locationText: string): { city: string; state: string } {
    // Parse location like "São Paulo, SP"
    const parts = locationText.split(",").map((p) => p.trim());
    return {
      city: parts[0] || "",
      state: parts[1] || "",
    };
  }

  private extractBrandModel(title: string): { brand?: string; model?: string } {
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
    const sellerText = $element.find(".ui-search-item__seller").text().toLowerCase();

    if (sellerText.includes("loja") || sellerText.includes("concession")) {
      return "dealer";
    }
    if (sellerText.includes("revenda")) {
      return "reseller";
    }

    return "individual";
  }
}
