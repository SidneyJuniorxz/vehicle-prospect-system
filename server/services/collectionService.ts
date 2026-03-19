import {
  createVehicleAd,
  getVehicleAdByExternalId,
  createLead,
  logActivity,
  createNotification,
  updateCollectionJob,
  updateLead,
} from "../db";
import { getScraperRegistry } from "../scrapers/scraperRegistry";
import { getHealthMonitor } from "./healthMonitorService";
import { FilterEngine } from "../filters/filterEngine";
import { ScoringEngine } from "../scoring/scoringEngine";
import { DeduplicationEngine } from "../dedup/deduplicationEngine";
import { generateAdHash } from "../scrapers/vehicleScraper";
import type { VehicleAd, InsertVehicleAd } from "../../drizzle/schema";
import { getEnrichmentService } from "./enrichmentService";
import { getWhatsAppBotService } from "./whatsAppBotService";
import { getWhatsappTemplates } from "../db";
export interface CollectionOptions {
  userId: number;
  searchParams: any;
  filterCriteria?: any;
  scoringRules?: any;
  jobId?: number;
  useLLM?: boolean;
  autoSend?: boolean;
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

    if (options.jobId) {
      await updateCollectionJob(options.jobId, { status: "running" });
    }

    // Auto-map searchParams to filterCriteria if missing
    if (!options.filterCriteria && options.searchParams) {
      options.filterCriteria = {
        minPrice: options.searchParams.minPrice ? parseFloat(options.searchParams.minPrice) : undefined,
        maxPrice: options.searchParams.maxPrice ? parseFloat(options.searchParams.maxPrice) : undefined,
        minYear: options.searchParams.minYear ? parseInt(options.searchParams.minYear) : undefined,
        maxYear: options.searchParams.maxYear ? parseInt(options.searchParams.maxYear) : undefined,
        maxMileage: options.searchParams.maxMileage ? parseInt(options.searchParams.maxMileage) : undefined,
        brands: options.searchParams.brand ? [options.searchParams.brand.toLowerCase()] : undefined,
        models: options.searchParams.model ? [options.searchParams.model.toLowerCase()] : undefined,
        states: options.searchParams.state ? [options.searchParams.state.toUpperCase()] : undefined,
        cities: options.searchParams.city ? [options.searchParams.city.toLowerCase()] : undefined,
      };
    }

    try {
      console.log(`[Collection] Starting collection for user ${options.userId} (Job: ${options.jobId || 'direct'})`);

      if (options.jobId) {
        await this.updateJobProgress(options.jobId, 0, 0, "Iniciando robôs de busca...");
      }

      const registry = getScraperRegistry();
      const healthMonitor = getHealthMonitor();

      const startTime = Date.now();
      let scrapedAds: any[] = [];

      try {
        if (options.jobId) {
          await this.updateJobProgress(options.jobId, 0, 0, "Acessando sites de anúncios...");
        }
        scrapedAds = await registry.searchAll(options.searchParams);
        result.totalCollected = scrapedAds.length;

        if (options.jobId) {
          await this.updateJobProgress(options.jobId, 0, result.totalCollected, `Encontrados ${result.totalCollected} anúncios. Iniciando processamento...`);
        }

        // Record success for each enabled scraper (simplification: assuming we track overall searchAll success here, 
        // though searchAll internally calls each scraper. A better approach is having searchAll report per-scraper stats,
        // but since searchAll catches errors individually, we can just record a general success or loop through enabled scrapers).
        const duration = Date.now() - startTime;
        const enabledScrapers = registry.getEnabledScrapers();
        for (const scraper of enabledScrapers) {
          healthMonitor.recordSuccess(scraper.getConfig().source, scrapedAds.filter(ad => ad.source === scraper.getConfig().source).length, duration);
        }

      } catch (searchError) {
        const duration = Date.now() - startTime;
        console.error("[Collection] Error during searchAll:", searchError);
        result.errors.push(`Erro durante a busca: ${String(searchError)}`);
      }

      let processedCount = 0;
      for (const scrapedAd of scrapedAds) {
        processedCount++;
        if (options.jobId && processedCount % 5 === 0) {
          await this.updateJobProgress(options.jobId, processedCount, result.totalCollected, `Processando anúncio ${processedCount} de ${result.totalCollected}...`);
        }
        try {
          let adId: number | undefined;
          const existingAd = await getVehicleAdByExternalId(scrapedAd.source, scrapedAd.externalId);

          if (existingAd) {
            adId = existingAd.id;
            result.totalDuplicates++;

            // Check if lead already exists for this ad
            const db = await (import("../db").then(m => m.getDb()));
            if (db) {
              const leadsTable = (await import("../../drizzle/schema")).leads;
              const existingLeads = await db.select().from(leadsTable).where((await import("drizzle-orm")).eq(leadsTable.adId, adId)).limit(1);
              if (existingLeads.length > 0) {
                // If lead exists, TRULY skip
                continue;
              }
            }
          }

          // LLM Enrichment Fallback / Assertiveness
          if (options.useLLM && (!scrapedAd.brand || !scrapedAd.model || scrapedAd.brand === "N/A")) {
            if (options.jobId) {
              await this.updateJobProgress(options.jobId, processedCount, result.totalCollected, `Usando IA para identificar veículo ${processedCount}...`);
            }
            const enrichment = await getEnrichmentService().enrichAd(scrapedAd.title, scrapedAd.description || "");
            if (enrichment && enrichment.confidence > 0.6) {
              console.log(`[Collection] IA enriqueceu anúncio: ${enrichment.brand} ${enrichment.model} (${enrichment.confidence})`);
              scrapedAd.brand = enrichment.brand || scrapedAd.brand;
              scrapedAd.model = enrichment.model || scrapedAd.model;
              scrapedAd.version = enrichment.version || scrapedAd.version;
              scrapedAd.year = enrichment.year || scrapedAd.year;
              scrapedAd.price = enrichment.price || scrapedAd.price;
              scrapedAd.mileage = enrichment.mileage || scrapedAd.mileage;
              if (enrichment.city) scrapedAd.city = enrichment.city;
              if (enrichment.state) scrapedAd.state = enrichment.state;
            }
          }

          if (!adId) {
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
            adId = (insertResult as any).insertId || (insertResult as any)[0]?.id || (insertResult as any)[0];
          }

          if (!adId) continue;

          if (options.filterCriteria) {
            this.filterEngine.updateCriteria(options.filterCriteria);
          }

          const mockAd: VehicleAd = {
            id: adId,
            externalId: scrapedAd.externalId,
            source: scrapedAd.source as any,
            url: scrapedAd.url,
            title: scrapedAd.title,
            brand: scrapedAd.brand,
            model: scrapedAd.model,
            version: scrapedAd.version,
            year: scrapedAd.year,
            mileage: scrapedAd.mileage,
            price: scrapedAd.price ? scrapedAd.price.toString() : null,
            city: scrapedAd.city,
            state: scrapedAd.state,
            sellerType: scrapedAd.sellerType as any,
            sellerName: scrapedAd.sellerName,
            description: scrapedAd.description,
            photoCount: scrapedAd.photoCount,
            photoUrls: scrapedAd.photoUrls ? JSON.stringify(scrapedAd.photoUrls) : null,
            adPostedAt: scrapedAd.adPostedAt,
            hash: generateAdHash(scrapedAd),
            collectedAt: new Date(),
            lastSeenAt: new Date(),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as VehicleAd;

          const matches = this.filterEngine.matches(mockAd);
          if (!matches) {
            console.log(`[Collection] Ad ${adId} (${mockAd.source}) filtered out. Brand: ${mockAd.brand}, Model: ${mockAd.model}`);
            continue;
          }

          console.log(`[Collection] Ad ${adId} passed filters. Creating lead...`);
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
          // Auto-send WhatsApp if enabled and high priority
          if (options.autoSend && scoringResult.priority === "high") {
            const bot = getWhatsAppBotService();
            if (bot.getStatus().status === "ready" && scrapedAd.contactInfo) {
              const templates = await getWhatsappTemplates(options.userId);
              const template = templates.find(t => t.status === "new");
              if (template) {
                let message = template.message
                  .replace(/{{veiculo}}/g, scrapedAd.title || "")
                  .replace(/{{preco}}/g, scrapedAd.price?.toString() || "")
                  .replace(/{{ano}}/g, scrapedAd.year?.toString() || "")
                  .replace(/{{km}}/g, scrapedAd.mileage?.toString() || "")
                  .replace(/{{cidade}}/g, scrapedAd.city || "");

                try {
                  const leadId = (leadResult as any).insertId || (leadResult as any)[0];
                  console.log(`[Collection] Auto-sending WhatsApp to ${scrapedAd.contactInfo} for lead ${leadId}`);
                  await bot.sendMessage(scrapedAd.contactInfo, message);
                  await updateLead(leadId, { status: "sent", contactedAt: new Date() });
                  await logActivity({
                    userId: options.userId,
                    action: "whatsapp_auto_sent",
                    entityType: "lead",
                    entityId: leadId,
                    details: `Mensagem enviada automaticamente para ${scrapedAd.contactInfo}`
                  });
                } catch (sendErr) {
                  console.error("[Collection] Error auto-sending WhatsApp:", sendErr);
                }
              }
            }
          }

          result.leadsCreated++;

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

      if (options.jobId) {
        await updateCollectionJob(options.jobId, {
          status: "completed",
          progress: {
            processed: result.totalCollected,
            total: result.totalCollected,
            currentStep: "Concluído",
            lastMessage: `Sucesso! ${result.leadsCreated} novos leads criados.`
          }
        });
      }

      console.log(`[Collection] Completed. Collected: ${result.totalCollected}, Filtered: ${result.totalFiltered}, Leads: ${result.leadsCreated}`);
    } catch (error) {
      console.error("[Collection] Fatal error:", error);
      result.errors.push(`Erro fatal na coleta: ${String(error)}`);
    }

    return result;
  }

  private async updateJobProgress(jobId: number, processed: number, total: number, message: string) {
    try {
      await updateCollectionJob(jobId, {
        progress: {
          processed,
          total,
          currentStep: message,
          lastMessage: message,
        },
      });
    } catch (e) {
      console.error("[Collection] Error updating job progress:", e);
    }
  }
}
