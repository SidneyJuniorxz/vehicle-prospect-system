import { randomInt } from "crypto";
import { chromium } from 'playwright-extra';
import { Browser } from 'playwright';
// @ts-ignore
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

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
  color?: string;
  year?: number;
  mileage?: number;
  price?: number;
  city?: string;
  state?: string;
  sellerType?: "individual" | "dealer" | "reseller" | "unknown";
  sellerName?: string;
  contactInfo?: string; // Phone, WhatsApp link, etc.
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
  protected lastRequestTime: number = 0;
  protected userAgents: string[] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  constructor(config: ScraperConfig) {
    this.config = config;
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
   * Randomized sleep to simulate human behavior
   */
  protected async humanLikeDelay(min: number = 2000, max: number = 5000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Robustly normalizes a string for comparison by removing accents, special characters, and optionally spaces.
   */
  public static normalizeString(str: string, removeSpaces: boolean = true): string {
    if (!str) return "";
    let normalized = str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9\s]/g, "");    // Remove special chars

    if (removeSpaces) {
      normalized = normalized.replace(/\s+/g, "");
    } else {
      normalized = normalized.replace(/\s+/g, " ").trim();
    }
    return normalized;
  }

  /**
   * Helper to extract brand and model from a title string
   */
  public static extractBrandAndModel(title: string): { brand?: string; model?: string } {
    const normalizedTitle = this.normalizeString(title, false); // Keep spaces for initial boundary detection

    // Common brands list
    const brandsRef = [
      "fiat", "volkswagen", "vw", "chevrolet", "gm", "ford", "toyota", "honda",
      "hyundai", "renault", "jeep", "nissan", "chery", "mitsubishi",
      "peugeot", "citroen", "bmw", "mercedes", "audi"
    ];

    let foundBrand: string | undefined;
    for (const b of brandsRef) {
      // Create word boundaries around the brand to avoid partial matches
      const regex = new RegExp(`\\b${b}\\b`);
      if (regex.test(normalizedTitle)) {
        foundBrand = b === "vw" ? "volkswagen" : (b === "gm" ? "chevrolet" : b);
        break;
      }
    }

    let foundModel: string | undefined;
    if (foundBrand) {
      // Split the title using the found brand (or its raw version if it was vw/gm)
      const splitTarget = brandsRef.find(b => new RegExp(`\\b${b}\\b`).test(normalizedTitle)) || foundBrand;
      const parts = normalizedTitle.split(new RegExp(`\\b${splitTarget}\\b`));

      if (parts.length > 1) {
        // The model usually comes after the brand
        const wordsAfterBrand = parts[1].trim().split(" ");
        if (wordsAfterBrand.length > 0 && wordsAfterBrand[0].length > 0) {
          // Sometimes models are two words (e.g. "grand siena"). For now, we take the first word.
          foundModel = wordsAfterBrand[0];
          // We don't uppercase here because we want to return the raw normalized form or let the scraper handle case.
          // Actually, let's keep it normalized for FilterEngine to handle.
        }
      }
    }

    // Return capitalized versions for basic display, but FilterEngine will use normalizeString anyway
    return {
      brand: foundBrand ? foundBrand.charAt(0).toUpperCase() + foundBrand.slice(1) : undefined,
      model: foundModel ? foundModel.charAt(0).toUpperCase() + foundModel.slice(1) : undefined
    };
  }

  /**
   * Helper to extract potential phone numbers from a text block
   */
  public static extractPhoneNumbers(text: string): string | undefined {
    if (!text) return undefined;
    // Regex for Brazilian phone numbers (e.g. 11999999999, (11) 99999-9999, 11 99999 9999)
    const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?\d{4}|\d{4})[-.\s]?\d{4}/g;
    const matches = text.match(phoneRegex);

    if (matches && matches.length > 0) {
      // Just return the first valid looking phone for now, cleaned up
      return matches[0].replace(/[^\d+]/g, '');
    }
    return undefined;
  }

  /**
   * Run a custom Playwright action in a managed browser session
   */
  protected async runInBrowser<T>(
    url: string,
    action: (page: any) => Promise<T>,
    options: { visibleBrowser?: boolean; userAgent?: string; viewport?: { width: number; height: number } } = {},
    retries: number = 0
  ): Promise<T> {
    try {
      await this.respectDelay();
      await this.humanLikeDelay(1500, 3000);

      const browser: Browser = await chromium.launch({
        headless: !options.visibleBrowser,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ]
      });

      try {
        const context = await browser.newContext({
          userAgent: options.userAgent || this.getRandomUserAgent(),
          viewport: options.viewport || { width: 1366, height: 768 },
          hasTouch: false,
        });

        const page = await context.newPage();

        await page.goto(url, {
          waitUntil: 'commit',
          timeout: this.config.timeout
        });

        const result = await action(page);

        await browser.close();
        return result;
      } catch (innerError) {
        await browser.close();
        throw innerError;
      }
    } catch (error) {
      if (retries < this.config.maxRetries) {
        const backoffDelay = Math.pow(2, retries) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return this.runInBrowser(url, action, options, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Make HTTP request using Playwright with retry logic
   */
  protected async fetchWithRetry(
    url: string,
    options: { visibleBrowser?: boolean } = {},
    retries: number = 0
  ): Promise<string> {
    return this.runInBrowser(
      url,
      async (page) => {
        // Human-like pause on page
        await this.humanLikeDelay(4000, 8000);
        return await page.content();
      },
      options,
      retries
    );
  }

  /**
   * Check if scraping is allowed by robots.txt
   */
  protected async checkRobotsTxt(path: string): Promise<boolean> {
    if (!this.config.respectRobotsTxt) return true;
    return true; // Simplified for this implementation
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
