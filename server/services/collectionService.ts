import {
  createVehicleAd,
  getVehicleAdByExternalId,
  createLead,
  logActivity,
  createNotification,
} from "../db";
import { scrapeAllSources } from "../scrapers/vehicleScraper";
import { FilterEngine } from "../filters/filterEngine";
import { ScoringEngine } from "../scoring/scoringEngine";
import { DeduplicationEngine } from "../dedup/deduplicationEngine";
import { generateAdHash } from "../scrapers/vehicleScraper";
import type { VehicleAd, InsertVehicleAd } from "../../drizzle/schema";

export interface CollectionOptions {
  userId: number;
  searchParams: any;
  filterCriteria?: any;
  scoringRules?: any;
}

export interface CollectionResult {
  totalCollected: number;
  totalFiltered: number;
  totalDuplicates: number;
  leadsCreated: number;
  errors: string[];
}

export class CollectionService {
  private filterEngine: FilterEngine;
  private scoringEngine: ScoringEngine;
  private deduplicationEngine: DeduplicationEngine;

  constructor() {
    this.filterEngine = new FilterEngine();
    this.scoringEngine = new ScoringEngine();
    this.deduplicationEngine = new DeduplicationEngine();
  }

  async collect(options: CollectionOptions): Promise<CollectionResult> {
    const result: CollectionResult = {
      totalCollected: 0,
      totalFiltered: 0,
      totalDuplicates: 0,
      leadsCreated: 0,
      errors: [],
    };

    try {
      console.log(`[Collection] Starting collection for user ${options.userId}`);

      const scrapedAds = await scrapeAllSources(options.searchParams);
      result.totalCollected = scrapedAds.length;

      for (const scrapedAd of scrapedAds) {
        try {
          const existingAd = await getVehicleAdByExternalId(scrapedAd.source, scrapedAd.externalId);

          if (existingAd) {
            result.totalDuplicates++;
            continue;
          }

          const adData: InsertVehicleAd = {
            externalId: scrapedAd.externalId,
            source: scrapedAd.source,
            url: scrapedAd.url,
            title: scrapedAd.title,
            brand: scrapedAd.brand,
            model: scrapedAd.model,
            version: scrapedAd.version,
            year: scrapedAd.year,
            mileage: scrapedAd.mileage,
            price: scrapedAd.price ? scrapedAd.price.toString() : undefined,
            city: scrapedAd.city,
            state: scrapedAd.state,
            sellerType: scrapedAd.sellerType,
            sellerName: scrapedAd.sellerName,
            description: scrapedAd.description,
            photoCount: scrapedAd.photoCount,
            photoUrls: scrapedAd.photoUrls ? JSON.stringify(scrapedAd.photoUrls) : undefined,
            adPostedAt: scrapedAd.adPostedAt,
            hash: generateAdHash(scrapedAd),
          };

          const insertResult = await createVehicleAd(adData);
          const adId = (insertResult as any).insertId || (insertResult as any)[0];

          if (options.filterCriteria) {
            this.filterEngine.updateCriteria(options.filterCriteria);
          }

          const mockAd: VehicleAd = {
            id: adId,
            ...adData,
            collectedAt: new Date(),
            lastSeenAt: new Date(),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            photoUrls: scrapedAd.photoUrls ? JSON.stringify(scrapedAd.photoUrls) : null,
            price: adData.price ? adData.price : null,
          } as VehicleAd;

          const matches = this.filterEngine.matches(mockAd);
          if (!matches) {
            continue;
          }

          result.totalFiltered++;

          const scoringResult = this.scoringEngine.score(mockAd);

          const leadResult = await createLead({
            adId,
            score: scoringResult.score.toString(),
            priority: scoringResult.priority,
            scoreReason: scoringResult.reasons.join("; "),
            status: "new",
          });

          result.leadsCreated++;

          if (scoringResult.priority === "high") {
            await createNotification({
              userId: options.userId,
              type: "high_priority",
              title: `Novo lead de alta prioridade: ${scrapedAd.title}`,
              message: `Score: ${scoringResult.score}. ${scoringResult.reasons.join(". ")}`,
              leadId: (leadResult as any).insertId || (leadResult as any)[0],
            });
          }
        } catch (adError) {
          console.error("[Collection] Error processing ad:", adError);
          result.errors.push(`Erro ao processar anúncio: ${String(adError)}`);
        }
      }

      await logActivity({
        userId: options.userId,
        action: "collection_completed",
        entityType: "collection",
        details: JSON.stringify(result),
      });

      console.log(`[Collection] Completed. Collected: ${result.totalCollected}, Filtered: ${result.totalFiltered}, Leads: ${result.leadsCreated}`);
    } catch (error) {
      console.error("[Collection] Fatal error:", error);
      result.errors.push(`Erro fatal na coleta: ${String(error)}`);
    }

    return result;
  }
}
