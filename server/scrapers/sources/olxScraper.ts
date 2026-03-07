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
      const searchUrl = this.buildSearchUrl(criteria);
      const html = await this.fetchWithRetry(searchUrl);
      const ads = this.parseAds(html);

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

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  private parseAds(html: string): ScrapedVehicleAd[] {
    const ads: ScrapedVehicleAd[] = [];

    try {
      const $ = cheerio.load(html);

      // OLX ad list structure (typical)
      // Adjust selectors based on actual OLX HTML structure
      $("div[data-testid='ad-item'], li.ad, article.ad").each((_, element) => {
        try {
          const $element = $(element);

          // Extract ad ID from data attributes or URL
          const adLink = $element.find("a[href*='/v/']").first();
          const url = adLink.attr("href") || "";
          const externalId = this.extractIdFromUrl(url);

          if (!externalId) return; // Skip if can't extract ID

          // Extract title
          const title =
            $element.find("h2, .ad-title, [data-testid='ad-title']").text() ||
            adLink.attr("title") ||
            "";

          // Extract price
          const priceText =
            $element.find(".price, [data-testid='ad-price'], .ad-price").text() || "";
          const price = this.extractPrice(priceText);

          // Extract location
          const locationText =
            $element.find(".location, [data-testid='ad-location']").text() || "";
          const { city, state } = this.parseLocation(locationText);

          // Extract mileage
          const mileageText = $element.find(".mileage, .km").text() || "";
          const mileage = this.extractMileage(mileageText);

          // Extract year
          const yearText = $element.find(".year, .ad-year").text() || "";
          const year = this.extractYear(yearText);

          // Extract brand and model from title
          const { brand, model } = this.extractBrandModel(title);

          // Extract seller type
          const sellerType = this.extractSellerType($element);

          // Extract photo count
          const photoCount = $element.find("img").length || 0;

          // Extract description/details
          const description =
            $element.find(".description, .ad-description").text() || "";

          // Extract posted date
          const dateText = $element.find(".date, [data-testid='ad-date']").text() || "";
          const adPostedAt = this.parseDate(dateText);

          const ad: ScrapedVehicleAd = {
            externalId,
            source: this.config.source,
            url: url.startsWith("http") ? url : `${this.config.baseUrl}${url}`,
            title: title.trim(),
            brand,
            model,
            year,
            mileage,
            price,
            city,
            state,
            sellerType,
            description: description.trim(),
            photoCount,
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
    // Extract ID from OLX URL format: /v/carros/.../{id}
    const match = url.match(/\/(\d+)(?:\?|$|\/)/);
    return match ? match[1] : "";
  }

  private extractPrice(priceText: string): string {
    // Extract price from text like "R$ 35.000" or "35000"
    const match = priceText.match(/[\d.]+/g);
    if (match) {
      return match.join("").replace(/\./g, "");
    }
    return "";
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
