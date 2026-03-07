import axios, { AxiosInstance } from "axios";
import { randomInt } from "crypto";

/**
 * Base configuration for all scrapers
 */
export interface ScraperConfig {
  name: string;
  source: string;
  baseUrl: string;
  enabled: boolean;
  minDelayMs: number;
  maxDelayMs: number;
  timeout: number;
  maxRetries: number;
  respectRobotsTxt: boolean;
}

/**
 * Scraped vehicle ad data
 */
export interface ScrapedVehicleAd {
  externalId: string;
  source: string;
  url: string;
  title: string;
  brand?: string;
  model?: string;
  version?: string;
  year?: number;
  mileage?: number;
  price?: string;
  city?: string;
  state?: string;
  sellerType?: "individual" | "dealer" | "reseller";
  sellerName?: string;
  description?: string;
  photoCount?: number;
  photoUrls?: string[];
  adPostedAt?: Date;
}

/**
 * Base class for all scrapers
 * Implements ethical scraping practices
 */
export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected client: AxiosInstance;
  protected lastRequestTime: number = 0;
  protected userAgents: string[] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  ];

  constructor(config: ScraperConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        "User-Agent": this.getRandomUserAgent(),
      },
    });
  }

  /**
   * Get a random user agent to avoid detection
   */
  protected getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Implement ethical delay between requests
   */
  protected async respectDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delay = randomInt(this.config.minDelayMs, this.config.maxDelayMs);

    if (timeSinceLastRequest < delay) {
      await new Promise((resolve) =>
        setTimeout(resolve, delay - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Make HTTP request with retry logic
   */
  protected async fetchWithRetry(
    url: string,
    retries: number = 0
  ): Promise<any> {
    try {
      await this.respectDelay();

      // Rotate user agent
      this.client.defaults.headers["User-Agent"] = this.getRandomUserAgent();

      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      if (retries < this.config.maxRetries) {
        const backoffDelay = Math.pow(2, retries) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return this.fetchWithRetry(url, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Check if scraping is allowed by robots.txt
   */
  protected async checkRobotsTxt(path: string): Promise<boolean> {
    if (!this.config.respectRobotsTxt) return true;

    try {
      const robotsContent = await this.fetchWithRetry("/robots.txt");
      const lines = robotsContent.split("\n");
      let userAgentMatch = false;

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.toLowerCase().startsWith("user-agent:")) {
          const agent = trimmed.substring("user-agent:".length).trim();
          userAgentMatch = agent === "*" || agent === "Googlebot";
        }

        if (
          userAgentMatch &&
          trimmed.toLowerCase().startsWith("disallow:")
        ) {
          const disallowPath = trimmed.substring("disallow:".length).trim();
          if (path.startsWith(disallowPath)) {
            return false;
          }
        }
      }

      return true;
    } catch {
      // If we can't fetch robots.txt, assume it's allowed
      return true;
    }
  }

  /**
   * Abstract method to be implemented by subclasses
   */
  abstract search(
    criteria: Record<string, any>
  ): Promise<ScrapedVehicleAd[]>;

  /**
   * Get scraper configuration
   */
  getConfig(): ScraperConfig {
    return this.config;
  }

  /**
   * Enable/disable scraper
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Update scraper configuration
   */
  updateConfig(updates: Partial<ScraperConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
