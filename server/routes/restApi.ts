import { Router, Request, Response } from "express";
import { getExportService } from "../services/exportService";
import { getScraperRegistry } from "../scrapers/scraperRegistry";
import { getHealthMonitor } from "../services/healthMonitorService";
import { getDb, getLeads, getVehicleAds } from "../db";

const router = Router();
const exportService = getExportService();
const scraperRegistry = getScraperRegistry();
const healthMonitor = getHealthMonitor();

/**
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get system version
 */
router.get("/version", (req: Request, res: Response) => {
  res.json({
    version: "1.0.0",
    features: ["scraping", "filtering", "scoring", "export"],
  });
});

/**
 * List all leads with optional filters
 */
router.get("/leads", async (req: Request, res: Response) => {
  try {
    const { priority, status, limit = 100, offset = 0 } = req.query;

    const leads = await getLeads(
      {
        priority: priority as string,
        status: status as string,
      },
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      data: leads,
      count: leads.length,
      limit,
      offset,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

/**
 * Get single lead with ad details
 */
router.get("/leads/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const leads = await getLeads({ id: parseInt(id) }, 1);

    if (leads.length === 0) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    const lead = leads[0];
    const ads = await getVehicleAds({ id: lead.adId }, 1);

    res.json({
      lead,
      ad: ads[0] || null,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

/**
 * Export leads
 */
router.post("/export", async (req: Request, res: Response) => {
  try {
    const { format = "csv", columns, filters } = req.body;

    if (!["csv", "excel", "json"].includes(format)) {
      res.status(400).json({ error: "Invalid format. Use csv, excel, or json" });
      return;
    }

    // Fetch leads with filters
    const leads = await getLeads(filters || {}, 10000);
    const ads = await getVehicleAds({}, 10000);

    // Prepare data for export
    const exportData = await exportService.prepareLeadsForExport(leads, ads);

    // Export based on format
    let content: string | Buffer;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "csv":
        content = await exportService.exportToCSV(exportData, columns);
        contentType = "text/csv";
        filename = exportService.generateFilename("csv");
        break;

      case "excel":
        content = await exportService.exportToExcel(exportData, columns);
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        filename = exportService.generateFilename("excel");
        break;

      case "json":
        content = await exportService.exportToJSON(exportData, columns);
        contentType = "application/json";
        filename = exportService.generateFilename("json");
        break;

      default:
        res.status(400).json({ error: "Invalid format" });
        return;
    }

    // Send file
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Failed to export leads" });
  }
});

/**
 * Get available export columns
 */
router.get("/export/columns", (req: Request, res: Response) => {
  res.json({
    columns: exportService.getAvailableColumns(),
  });
});

/**
 * Get scraper sources
 */
router.get("/scrapers", (req: Request, res: Response) => {
  const configs = scraperRegistry.getAllConfigs();
  res.json({
    sources: configs.map((c) => ({
      id: c.source,
      name: c.name,
      enabled: c.enabled,
      baseUrl: c.baseUrl,
    })),
  });
});

/**
 * Get scraper health status
 */
router.get("/scrapers/health", (req: Request, res: Response) => {
  const report = healthMonitor.getHealthReport();
  res.json(report);
});

/**
 * Get specific scraper health
 */
router.get("/scrapers/:source/health", (req: Request, res: Response) => {
  const { source } = req.params;
  const health = healthMonitor.getScraperHealth(source);

  if (!health) {
    res.status(404).json({ error: "Scraper not found" });
    return;
  }

  res.json(health);
});

/**
 * Get scraper statistics
 */
router.get("/scrapers/:source/stats", (req: Request, res: Response) => {
  const { source } = req.params;
  const stats = healthMonitor.getScraperStats(source);

  if (!stats) {
    res.status(404).json({ error: "Scraper not found" });
    return;
  }

  res.json(stats);
});

/**
 * Trigger manual collection
 */
router.post("/collect", async (req: Request, res: Response) => {
  try {
    const { sources = [], criteria = {} } = req.body;

    if (sources.length === 0) {
      res.status(400).json({ error: "No sources specified" });
      return;
    }

    // Start collection in background
    const results = [];
    for (const source of sources) {
      const scraper = scraperRegistry.getScraper(source);
      if (scraper) {
        try {
          const ads = await scraper.search(criteria);
          results.push({
            source,
            status: "success",
            adsFound: ads.length,
          });
        } catch (error) {
          results.push({
            source,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    res.json({
      status: "completed",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Collection failed" });
  }
});

/**
 * Get collection history
 */
router.get("/collection/history", (req: Request, res: Response) => {
  const { source, limit = 100 } = req.query;
  const history = healthMonitor.getCollectionHistory(
    source as string,
    parseInt(limit as string)
  );

  res.json({
    history,
    count: history.length,
  });
});

/**
 * API Documentation
 */
router.get("/docs", (req: Request, res: Response) => {
  const docs = {
    title: "Vehicle Prospect System - REST API",
    version: "1.0.0",
    baseUrl: "/api/rest",
    endpoints: [
      {
        path: "/health",
        method: "GET",
        description: "Health check",
      },
      {
        path: "/version",
        method: "GET",
        description: "Get system version",
      },
      {
        path: "/leads",
        method: "GET",
        description: "List leads",
        queryParams: {
          priority: "high|medium|low",
          status: "new|reviewed|approved|rejected",
          limit: "number",
          offset: "number",
        },
      },
      {
        path: "/leads/:id",
        method: "GET",
        description: "Get single lead with ad details",
      },
      {
        path: "/export",
        method: "POST",
        description: "Export leads",
        body: {
          format: "csv|excel|json",
          columns: ["array of column names"],
          filters: "object with filter criteria",
        },
      },
      {
        path: "/export/columns",
        method: "GET",
        description: "Get available export columns",
      },
      {
        path: "/scrapers",
        method: "GET",
        description: "List available scrapers",
      },
      {
        path: "/scrapers/health",
        method: "GET",
        description: "Get all scrapers health status",
      },
      {
        path: "/scrapers/:source/health",
        method: "GET",
        description: "Get specific scraper health",
      },
      {
        path: "/scrapers/:source/stats",
        method: "GET",
        description: "Get scraper statistics",
      },
      {
        path: "/collect",
        method: "POST",
        description: "Trigger manual collection",
        body: {
          sources: ["array of source ids"],
          criteria: "search criteria object",
        },
      },
      {
        path: "/collection/history",
        method: "GET",
        description: "Get collection history",
        queryParams: {
          source: "source id (optional)",
          limit: "number",
        },
      },
    ],
  };

  res.json(docs);
});

export default router;
