import { getScraperRegistry } from "../scrapers/scraperRegistry";
import { ScraperConfig, ScrapedVehicleAd } from "../scrapers/baseScraper";
import {
  createVehicleAd,
  updateVehicleAd,
  getVehicleAdByHash,
} from "../db";
import { createHash } from "crypto";

/**
 * Service for managing scraper operations and data collection
 */
export class ScraperManagementService {
  private registry = getScraperRegistry();

  /**
   * Get all available scrapers with their status
   */
  async getScrapers(): Promise<
    Array<{
      source: string;
      name: string;
      enabled: boolean;
      config: ScraperConfig;
    }>
  > {
    return this.registry.getAllConfigs().map((config) => ({
      source: config.source,
      name: config.name,
      enabled: config.enabled,
      config,
    }));
  }

  /**
   * Enable a scraper
   */
  async enableScraper(source: string): Promise<boolean> {
    return this.registry.enableScraper(source);
  }

  /**
   * Disable a scraper
   */
  async disableScraper(source: string): Promise<boolean> {
    return this.registry.disableScraper(source);
  }

  /**
   * Update scraper configuration
   */
  async updateScraperConfig(
    source: string,
    updates: Partial<ScraperConfig>
  ): Promise<boolean> {
    return this.registry.updateScraperConfig(source, updates);
  }

  /**
   * Collect ads from all enabled sources
   */
  async collectFromAllSources(
    criteria: Record<string, any>
  ): Promise<{
    total: number;
    created: number;
    updated: number;
    errors: Array<{ source: string; error: string }>;
  }> {
    const results = {
      total: 0,
      created: 0,
      updated: 0,
      errors: [] as Array<{ source: string; error: string }>,
    };

    try {
      const ads = await this.registry.searchAll(criteria);
      results.total = ads.length;

      for (const ad of ads) {
        try {
          const result = await this.saveAd(ad);
          if (result.created) {
            results.created++;
          } else if (result.updated) {
            results.updated++;
          }
        } catch (error) {
          console.error("Error saving ad:", error);
        }
      }
    } catch (error) {
      results.errors.push({
        source: "all",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return results;
  }

  /**
   * Collect ads from specific source
   */
  async collectFromSource(
    source: string,
    criteria: Record<string, any>
  ): Promise<{
    total: number;
    created: number;
    updated: number;
    error?: string;
  }> {
    const results: {
      total: number;
      created: number;
      updated: number;
      error?: string;
    } = {
      total: 0,
      created: 0,
      updated: 0,
    };

    try {
      const ads = await this.registry.search(source, criteria);
      results.total = ads.length;

      for (const ad of ads) {
        try {
          const result = await this.saveAd(ad);
          if (result.created) {
            results.created++;
          } else if (result.updated) {
            results.updated++;
          }
        } catch (error) {
          console.error("Error saving ad:", error);
        }
      }
    } catch (error) {
      results.error = error instanceof Error ? error.message : "Unknown error";
    }

    return results;
  }

  /**
   * Save or update an ad in the database
   */
  private async saveAd(
    scrapedAd: ScrapedVehicleAd
  ): Promise<{ created: boolean; updated: boolean }> {
    // Generate hash for deduplication
    const hash = this.generateHash(scrapedAd);

    // Check if ad already exists
    const existing = await getVehicleAdByHash(hash);

    if (existing) {
      // Update existing ad
      await updateVehicleAd(existing.id, {
        lastSeenAt: new Date(),
        isActive: true,
      });
      return { created: false, updated: true };
    }

    // Create new ad
    await createVehicleAd({
      externalId: scrapedAd.externalId,
      source: scrapedAd.source as any,
      url: scrapedAd.url,
      title: scrapedAd.title,
      brand: scrapedAd.brand,
      model: scrapedAd.model,
      version: scrapedAd.version,
      year: scrapedAd.year,
      mileage: scrapedAd.mileage,
      price: scrapedAd.price?.toString(),
      city: scrapedAd.city,
      state: scrapedAd.state,
      sellerType: scrapedAd.sellerType,
      sellerName: scrapedAd.sellerName,
      description: scrapedAd.description,
      photoCount: scrapedAd.photoCount,
      photoUrls: scrapedAd.photoUrls
        ? JSON.stringify(scrapedAd.photoUrls)
        : null,
      adPostedAt: scrapedAd.adPostedAt,
      collectedAt: new Date(),
      lastSeenAt: new Date(),
      isActive: true,
      hash,
    });

    return { created: true, updated: false };
  }

  /**
   * Generate hash for ad deduplication
   */
  private generateHash(ad: ScrapedVehicleAd): string {
    const key = `${ad.source}:${ad.externalId}:${ad.title}:${ad.price}`;
    return createHash("sha256").update(key).digest("hex");
  }

  /**
   * Get scraper statistics
   */
  getStats() {
    return this.registry.getStats();
  }
}
