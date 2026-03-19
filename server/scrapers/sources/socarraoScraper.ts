import { BaseScraper, ScraperConfig, ScrapedVehicleAd } from "../baseScraper";
import * as cheerio from "cheerio";

/**
 * SóCarrão Scraper
 * Handles scraping of vehicle ads from SóCarrão with real HTML parsing
 */
export class SoCarraoScraper extends BaseScraper {
  constructor(config: ScraperConfig) {
    super(config);
  }

  async search(criteria: Record<string, any>): Promise<ScrapedVehicleAd[]> {
    try {
      const searchUrl = this.buildSearchUrl(criteria);
      const html = await this.fetchWithRetry(searchUrl);
      const ads = this.parseAds(html, criteria);

      console.log(`[SóCarrão] Found ${ads.length} ads`);
      return ads;
    } catch (error) {
      console.error("[SóCarrão] Scraper error:", error);
      return [];
    }
  }

  private buildSearchUrl(criteria: Record<string, any>): string {
    const params = new URLSearchParams();

    if (criteria.state) {
      params.append("estado", criteria.state);
    }
    if (criteria.city) {
      params.append("cidade", criteria.city);
    }
    if (criteria.minPrice) {
      params.append("precoMin", criteria.minPrice);
    }
    if (criteria.maxPrice) {
      params.append("precoMax", criteria.maxPrice);
    }

    // Add search query for brand and model
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

      // SóCarrão item structure
      $("div.car-item, article.vehicle, div.anuncio").each((_, element) => {
        try {
          const $element = $(element);

          // Extract ad link
          const adLink = $element.find("a[href*='/veiculo/']").first();
          const url = adLink.attr("href") || "";
          const externalId = this.extractIdFromUrl(url);

          if (!externalId) return;

          // Extract title
          const title = $element.find("h2, .vehicle-title, .titulo").text() || "";

          // Extract price
          const priceText = $element.find(".price, .preco").text() || "";
          const price = this.extractPrice(priceText);

          // Extract location
          const locationText = $element.find(".location, .localizacao").text() || "";
          const { city, state } = this.parseLocation(locationText);

          // Extract mileage
          const mileageText = $element.find(".mileage, .km, .quilometragem").text() || "";
          const mileage = this.extractMileage(mileageText);

          // Extract year
          const yearText = $element.find(".year, .ano").text() || "";
          const year = this.extractYear(yearText);

          // Extract real brand and model from title
          const { brand: extractedBrand, model: extractedModel } = BaseScraper.extractBrandAndModel(title);

          // Extract seller type
          const sellerType = this.extractSellerType($element);

          // Extract photo count
          const photoCount = $element.find("img").length || 0;

          // Extract description
          const description = $element.find(".description, .descricao").text() || "";

          const ad: ScrapedVehicleAd = {
            externalId,
            source: this.config.source,
            url: url.startsWith("http") ? url : `${this.config.baseUrl}${url}`,
            title: title.trim(),
            brand: extractedBrand || criteria.brand,
            model: extractedModel || criteria.model,
            year,
            mileage,
            price,
            city,
            state,
            sellerType,
            description: description.trim(),
            photoCount,
          };

          ads.push(ad);
        } catch (error) {
          console.error("[SóCarrão] Error parsing individual ad:", error);
        }
      });

      return ads;
    } catch (error) {
      console.error("[SóCarrão] Error parsing HTML:", error);
      return [];
    }
  }

  private extractIdFromUrl(url: string): string {
    // Extract ID from SóCarrão URL format: /veiculo/{id}
    const match = url.match(/\/veiculo\/(\d+)/);
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

  private extractMileage(mileageText: string): number | undefined {
    const match = mileageText.match(/(\d+)\s*(?:km|quilômetro)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractYear(yearText: string): number | undefined {
    const match = yearText.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0], 10) : undefined;
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
    const sellerText = $element.find(".seller-type, .badge").text().toLowerCase();

    if (sellerText.includes("loja") || sellerText.includes("concession")) {
      return "dealer";
    }
    if (sellerText.includes("revenda")) {
      return "reseller";
    }

    return "individual";
  }
}
