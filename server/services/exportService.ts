import { createObjectCsvWriter } from "csv-writer";
import * as XLSX from "xlsx";
import { leads, vehicleAds } from "../../drizzle/schema";

export interface ExportOptions {
  format: "csv" | "excel" | "json";
  columns?: string[];
  filters?: Record<string, any>;
  includeAds?: boolean;
}

export interface LeadExportData {
  id: number;
  adId: number;
  score: string;
  priority: string;
  status: string;
  notes?: string;
  contactedAt?: string;
  // Vehicle ad fields
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: string;
  mileage?: number;
  city?: string;
  state?: string;
  url?: string;
  source?: string;
}

/**
 * Service for exporting leads in multiple formats
 */
export class ExportService {
  /**
   * Export leads to CSV
   */
  async exportToCSV(
    leads: LeadExportData[],
    columns?: string[]
  ): Promise<string> {
    if (leads.length === 0) {
      return "No data to export";
    }

    // Determine columns to export
    const exportColumns = columns || this.getDefaultColumns(leads[0]);

    // Create CSV header and rows
    const csvHeader = exportColumns.join(",");
    const csvRows = leads.map((lead) =>
      exportColumns
        .map((col) => {
          const value = (lead as any)[col];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === "string" && value.includes(",")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || "";
        })
        .join(",")
    );

    return [csvHeader, ...csvRows].join("\n");
  }

  /**
   * Export leads to Excel
   */
  async exportToExcel(
    leads: LeadExportData[],
    columns?: string[]
  ): Promise<Buffer> {
    if (leads.length === 0) {
      throw new Error("No data to export");
    }

    const exportColumns = columns || this.getDefaultColumns(leads[0]);

    // Create worksheet data
    const wsData = [
      exportColumns, // Header
      ...leads.map((lead) =>
        exportColumns.map((col) => (lead as any)[col] || "")
      ),
    ];

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");

    // Style header row
    const headerStyle = {
      fill: { fgColor: { rgb: "FFCCCCCC" } },
      font: { bold: true },
      alignment: { horizontal: "center" },
    };

    // Apply styles to header
    for (let i = 0; i < exportColumns.length; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = headerStyle;
    }

    // Auto-size columns
    const colWidths = exportColumns.map((col) => ({
      wch: Math.max(col.length, 15),
    }));
    ws["!cols"] = colWidths;

    // Convert to buffer
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * Export leads to JSON
   */
  async exportToJSON(
    leads: LeadExportData[],
    columns?: string[]
  ): Promise<string> {
    if (leads.length === 0) {
      return JSON.stringify([], null, 2);
    }

    const exportColumns = columns || this.getDefaultColumns(leads[0]);

    // Filter to only selected columns
    const filtered = leads.map((lead) => {
      const obj: Record<string, any> = {};
      for (const col of exportColumns) {
        obj[col] = (lead as any)[col];
      }
      return obj;
    });

    return JSON.stringify(filtered, null, 2);
  }

  /**
   * Get default columns based on lead data
   */
  private getDefaultColumns(lead: LeadExportData): string[] {
    return [
      "id",
      "adId",
      "score",
      "priority",
      "status",
      "title",
      "brand",
      "model",
      "year",
      "price",
      "mileage",
      "city",
      "state",
      "source",
      "url",
      "notes",
      "contactedAt",
    ];
  }

  /**
   * Get available columns for export
   */
  getAvailableColumns(): string[] {
    return [
      { name: "ID", value: "id" },
      { name: "Score", value: "score" },
      { name: "Priority", value: "priority" },
      { name: "Status", value: "status" },
      { name: "Title", value: "title" },
      { name: "Brand", value: "brand" },
      { name: "Model", value: "model" },
      { name: "Year", value: "year" },
      { name: "Price", value: "price" },
      { name: "Mileage", value: "mileage" },
      { name: "City", value: "city" },
      { name: "State", value: "state" },
      { name: "Source", value: "source" },
      { name: "URL", value: "url" },
      { name: "Notes", value: "notes" },
      { name: "Contacted At", value: "contactedAt" },
    ].map((col) => col.value);
  }

  /**
   * Prepare leads for export with joined ad data
   */
  async prepareLeadsForExport(
    leadsData: any[],
    adsData: any[]
  ): Promise<LeadExportData[]> {
    const adsMap = new Map(adsData.map((ad) => [ad.id, ad]));

    return leadsData.map((lead) => {
      const ad = adsMap.get(lead.adId);
      return {
        id: lead.id,
        adId: lead.adId,
        score: lead.score?.toString() || "0",
        priority: lead.priority || "medium",
        status: lead.status || "new",
        notes: lead.notes,
        contactedAt: lead.contactedAt?.toISOString(),
        // Ad fields
        title: ad?.title,
        brand: ad?.brand,
        model: ad?.model,
        year: ad?.year,
        price: ad?.price?.toString(),
        mileage: ad?.mileage,
        city: ad?.city,
        state: ad?.state,
        url: ad?.url,
        source: ad?.source,
      };
    });
  }

  /**
   * Generate filename for export
   */
  generateFilename(format: "csv" | "excel" | "json"): string {
    const timestamp = new Date().toISOString().split("T")[0];
    const ext = format === "excel" ? "xlsx" : format;
    return `leads_export_${timestamp}.${ext}`;
  }
}

// Singleton instance
let exportServiceInstance: ExportService | null = null;

export function getExportService(): ExportService {
  if (!exportServiceInstance) {
    exportServiceInstance = new ExportService();
  }
  return exportServiceInstance;
}
