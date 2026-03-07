import { getScraperRegistry } from "../scrapers/scraperRegistry";

export interface ScraperHealth {
  source: string;
  name: string;
  enabled: boolean;
  status: "healthy" | "warning" | "error";
  lastCheck: Date;
  errorCount: number;
  successCount: number;
  averageResponseTime: number;
  lastError?: string;
  uptime: number; // percentage
}

export interface HealthReport {
  timestamp: Date;
  overallStatus: "healthy" | "degraded" | "critical";
  scrapers: ScraperHealth[];
  totalAdsCollected: number;
  totalErrors: number;
  averageResponseTime: number;
}

/**
 * Service for monitoring scraper health and performance
 */
export class HealthMonitorService {
  private registry = getScraperRegistry();
  private healthMetrics: Map<string, ScraperHealth> = new Map();
  private collectionHistory: Array<{
    source: string;
    timestamp: Date;
    adsCollected: number;
    duration: number;
    success: boolean;
    error?: string;
  }> = [];

  constructor() {
    this.initializeMetrics();
  }

  /**
   * Initialize health metrics for all scrapers
   */
  private initializeMetrics(): void {
    const scrapers = this.registry.getAllConfigs();

    for (const config of scrapers) {
      this.healthMetrics.set(config.source, {
        source: config.source,
        name: config.name,
        enabled: config.enabled,
        status: "healthy",
        lastCheck: new Date(),
        errorCount: 0,
        successCount: 0,
        averageResponseTime: 0,
        uptime: 100,
      });
    }
  }

  /**
   * Record a successful collection
   */
  recordSuccess(
    source: string,
    adsCollected: number,
    duration: number
  ): void {
    const health = this.healthMetrics.get(source);
    if (!health) return;

    health.successCount++;
    health.errorCount = Math.max(0, health.errorCount - 1);
    health.averageResponseTime =
      (health.averageResponseTime * (health.successCount - 1) + duration) /
      health.successCount;
    health.lastCheck = new Date();
    health.lastError = undefined;

    this.updateStatus(health);

    this.collectionHistory.push({
      source,
      timestamp: new Date(),
      adsCollected,
      duration,
      success: true,
    });

    console.log(
      `[Health] ${source}: Success (${adsCollected} ads in ${duration}ms)`
    );
  }

  /**
   * Record a failed collection
   */
  recordError(source: string, error: string, duration: number): void {
    const health = this.healthMetrics.get(source);
    if (!health) return;

    health.errorCount++;
    health.lastError = error;
    health.lastCheck = new Date();
    health.averageResponseTime =
      (health.averageResponseTime * (health.successCount + health.errorCount - 1) +
        duration) /
      (health.successCount + health.errorCount);

    this.updateStatus(health);

    this.collectionHistory.push({
      source,
      timestamp: new Date(),
      adsCollected: 0,
      duration,
      success: false,
      error,
    });

    console.error(`[Health] ${source}: Error - ${error}`);
  }

  /**
   * Update scraper status based on metrics
   */
  private updateStatus(health: ScraperHealth): void {
    const total = health.successCount + health.errorCount;
    if (total === 0) {
      health.status = "healthy";
      health.uptime = 100;
      return;
    }

    health.uptime = (health.successCount / total) * 100;

    if (health.uptime >= 95) {
      health.status = "healthy";
    } else if (health.uptime >= 80) {
      health.status = "warning";
    } else {
      health.status = "error";
    }
  }

  /**
   * Get health report for all scrapers
   */
  getHealthReport(): HealthReport {
    const scrapers = Array.from(this.healthMetrics.values());

    const totalErrors = scrapers.reduce((sum, s) => sum + s.errorCount, 0);
    const totalSuccesses = scrapers.reduce((sum, s) => sum + s.successCount, 0);
    const averageResponseTime =
      scrapers.reduce((sum, s) => sum + s.averageResponseTime, 0) /
      scrapers.length;

    let overallStatus: "healthy" | "degraded" | "critical" = "healthy";
    const errorScrapers = scrapers.filter((s) => s.status === "error").length;
    const warningScrapers = scrapers.filter((s) => s.status === "warning").length;

    if (errorScrapers > 0) {
      overallStatus = "critical";
    } else if (warningScrapers > scrapers.length / 2) {
      overallStatus = "degraded";
    }

    return {
      timestamp: new Date(),
      overallStatus,
      scrapers,
      totalAdsCollected: this.collectionHistory.reduce(
        (sum, h) => sum + h.adsCollected,
        0
      ),
      totalErrors,
      averageResponseTime,
    };
  }

  /**
   * Get health for specific scraper
   */
  getScraperHealth(source: string): ScraperHealth | undefined {
    return this.healthMetrics.get(source);
  }

  /**
   * Get collection history
   */
  getCollectionHistory(
    source?: string,
    limit = 100
  ): typeof this.collectionHistory {
    let history = this.collectionHistory;

    if (source) {
      history = history.filter((h) => h.source === source);
    }

    return history.slice(-limit);
  }

  /**
   * Get statistics for a scraper
   */
  getScraperStats(source: string) {
    const health = this.healthMetrics.get(source);
    if (!health) return null;

    const history = this.getCollectionHistory(source);
    const successfulCollections = history.filter((h) => h.success);
    const totalAds = successfulCollections.reduce(
      (sum, h) => sum + h.adsCollected,
      0
    );
    const averageDuration =
      history.length > 0
        ? history.reduce((sum, h) => sum + h.duration, 0) / history.length
        : 0;

    return {
      ...health,
      totalCollections: history.length,
      successfulCollections: successfulCollections.length,
      totalAdsCollected: totalAds,
      averageAdsPerCollection:
        successfulCollections.length > 0
          ? totalAds / successfulCollections.length
          : 0,
      averageDuration,
    };
  }

  /**
   * Get alerts based on health status
   */
  getAlerts(): Array<{
    severity: "info" | "warning" | "error";
    source: string;
    message: string;
    timestamp: Date;
  }> {
    const alerts: Array<{
      severity: "info" | "warning" | "error";
      source: string;
      message: string;
      timestamp: Date;
    }> = [];

    const report = this.getHealthReport();

    // Check for critical scrapers
    for (const scraper of report.scrapers) {
      if (scraper.status === "error") {
        alerts.push({
          severity: "error",
          source: scraper.name,
          message: `Scraper ${scraper.name} está com taxa de erro alta (${(100 - scraper.uptime).toFixed(1)}%)`,
          timestamp: new Date(),
        });
      } else if (scraper.status === "warning") {
        alerts.push({
          severity: "warning",
          source: scraper.name,
          message: `Scraper ${scraper.name} está com performance degradada`,
          timestamp: new Date(),
        });
      }
    }

    // Check for high response times
    for (const scraper of report.scrapers) {
      if (scraper.averageResponseTime > 10000) {
        alerts.push({
          severity: "warning",
          source: scraper.name,
          message: `Tempo de resposta alto para ${scraper.name} (${scraper.averageResponseTime.toFixed(0)}ms)`,
          timestamp: new Date(),
        });
      }
    }

    return alerts;
  }

  /**
   * Reset metrics for a scraper
   */
  resetMetrics(source: string): void {
    const health = this.healthMetrics.get(source);
    if (health) {
      health.errorCount = 0;
      health.successCount = 0;
      health.averageResponseTime = 0;
      health.status = "healthy";
      health.uptime = 100;
      health.lastError = undefined;
    }
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.initializeMetrics();
    this.collectionHistory = [];
  }
}

// Singleton instance
let monitorInstance: HealthMonitorService | null = null;

export function getHealthMonitor(): HealthMonitorService {
  if (!monitorInstance) {
    monitorInstance = new HealthMonitorService();
  }
  return monitorInstance;
}
