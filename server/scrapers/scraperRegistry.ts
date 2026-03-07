import { BaseScraper, ScraperConfig, ScrapedVehicleAd } from "./baseScraper";
import { OlxScraper } from "./sources/olxScraper";
import { MercadoLivreScraper } from "./sources/mercadoLivreScraper";
import { WebmotorsScraper } from "./sources/webmotorsScraper";
import { iCarrosScraper } from "./sources/icarrosScraper";
import { SoCarraoScraper } from "./sources/socarraoScraper";

/**
 * Registry for managing multiple scrapers
 */
export class ScraperRegistry {
  private scrapers: Map<string, BaseScraper> = new Map();
  private configs: Map<string, ScraperConfig> = new Map();

  constructor() {
    this.registerDefaultScrapers();
  }

  /**
   * Register default scrapers
   */
  private registerDefaultScrapers(): void {
    // OLX
    this.register(
      new OlxScraper({
        name: "OLX",
        source: "olx",
        baseUrl: "https://www.olx.com.br",
        enabled: true,
        minDelayMs: 2000,
        maxDelayMs: 5000,
        timeout: 15000,
        maxRetries: 3,
        respectRobotsTxt: true,
      })
    );

    // Mercado Livre
    this.register(
      new MercadoLivreScraper({
        name: "Mercado Livre",
        source: "mercado_livre",
        baseUrl: "https://www.mercadolivre.com.br",
        enabled: true,
        minDelayMs: 2000,
        maxDelayMs: 5000,
        timeout: 15000,
        maxRetries: 3,
        respectRobotsTxt: true,
      })
    );

    // Webmotors
    this.register(
      new WebmotorsScraper({
        name: "Webmotors",
        source: "webmotors",
        baseUrl: "https://www.webmotors.com.br",
        enabled: true,
        minDelayMs: 2000,
        maxDelayMs: 5000,
        timeout: 15000,
        maxRetries: 3,
        respectRobotsTxt: true,
      })
    );

    // iCarros
    this.register(
      new iCarrosScraper({
        name: "iCarros",
        source: "icarros",
        baseUrl: "https://www.icarros.com.br",
        enabled: true,
        minDelayMs: 2000,
        maxDelayMs: 5000,
        timeout: 15000,
        maxRetries: 3,
        respectRobotsTxt: true,
      })
    );

    // SóCarrão
    this.register(
      new SoCarraoScraper({
        name: "SóCarrão",
        source: "socarrao",
        baseUrl: "https://www.socarrao.com.br",
        enabled: true,
        minDelayMs: 2000,
        maxDelayMs: 5000,
        timeout: 15000,
        maxRetries: 3,
        respectRobotsTxt: true,
      })
    );
  }

  /**
   * Register a new scraper
   */
  register(scraper: BaseScraper): void {
    const config = scraper.getConfig();
    this.scrapers.set(config.source, scraper);
    this.configs.set(config.source, config);
  }

  /**
   * Get scraper by source
   */
  getScraper(source: string): BaseScraper | undefined {
    return this.scrapers.get(source);
  }

  /**
   * Get all scrapers
   */
  getAllScrapers(): BaseScraper[] {
    return Array.from(this.scrapers.values());
  }

  /**
   * Get enabled scrapers
   */
  getEnabledScrapers(): BaseScraper[] {
    return Array.from(this.scrapers.values()).filter(
      (s) => s.getConfig().enabled
    );
  }

  /**
   * Get all configurations
   */
  getAllConfigs(): ScraperConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Enable scraper
   */
  enableScraper(source: string): boolean {
    const scraper = this.scrapers.get(source);
    if (scraper) {
      scraper.setEnabled(true);
      return true;
    }
    return false;
  }

  /**
   * Disable scraper
   */
  disableScraper(source: string): boolean {
    const scraper = this.scrapers.get(source);
    if (scraper) {
      scraper.setEnabled(false);
      return true;
    }
    return false;
  }

  /**
   * Update scraper configuration
   */
  updateScraperConfig(
    source: string,
    updates: Partial<ScraperConfig>
  ): boolean {
    const scraper = this.scrapers.get(source);
    if (scraper) {
      scraper.updateConfig(updates);
      this.configs.set(source, scraper.getConfig());
      return true;
    }
    return false;
  }

  /**
   * Search across all enabled scrapers
   */
  async searchAll(criteria: Record<string, any>): Promise<ScrapedVehicleAd[]> {
    const results: ScrapedVehicleAd[] = [];
    const enabledScrapers = this.getEnabledScrapers();

    for (const scraper of enabledScrapers) {
      try {
        const ads = await scraper.search(criteria);
        results.push(...ads);
      } catch (error) {
        console.error(
          `Error scraping ${scraper.getConfig().name}:`,
          error
        );
      }
    }

    return results;
  }

  /**
   * Search specific source
   */
  async search(
    source: string,
    criteria: Record<string, any>
  ): Promise<ScrapedVehicleAd[]> {
    const scraper = this.getScraper(source);
    if (!scraper) {
      throw new Error(`Scraper not found for source: ${source}`);
    }
    return scraper.search(criteria);
  }

  /**
   * Get scraper statistics
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    sources: string[];
  } {
    const allScrapers = this.getAllScrapers();
    const enabledScrapers = this.getEnabledScrapers();

    return {
      total: allScrapers.length,
      enabled: enabledScrapers.length,
      disabled: allScrapers.length - enabledScrapers.length,
      sources: allScrapers.map((s) => s.getConfig().source),
    };
  }
}

// Singleton instance
let registryInstance: ScraperRegistry | null = null;

export function getScraperRegistry(): ScraperRegistry {
  if (!registryInstance) {
    registryInstance = new ScraperRegistry();
  }
  return registryInstance;
}
