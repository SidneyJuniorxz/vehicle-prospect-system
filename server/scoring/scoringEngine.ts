import type { VehicleAd } from "../../drizzle/schema";
import { detectUrgencySignals } from "../scrapers/vehicleScraper";

export interface ScoringRule {
  name: string;
  weight: number;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface ScoringResult {
  score: number;
  priority: "high" | "medium" | "low";
  reasons: string[];
}

export class ScoringEngine {
  private rules: Map<string, ScoringRule> = new Map();
  private defaultRules: Record<string, ScoringRule> = {
    priceBelow: {
      name: "Price Below Average",
      weight: 25,
      enabled: true,
      config: { targetPrice: 50000 },
    },
    recentAd: {
      name: "Recent Advertisement",
      weight: 20,
      enabled: true,
      config: { maxDaysOld: 3 },
    },
    urgencySignals: {
      name: "Urgency Signals",
      weight: 20,
      enabled: true,
    },
    lowMileage: {
      name: "Low Mileage",
      weight: 15,
      enabled: true,
      config: { maxMileage: 100000 },
    },
    individualSeller: {
      name: "Individual Seller",
      weight: 10,
      enabled: true,
    },
    photoCount: {
      name: "Photo Count",
      weight: 10,
      enabled: true,
      config: { minPhotos: 5 },
    },
  };

  constructor(customRules?: Record<string, ScoringRule>) {
    this.initializeRules(customRules);
  }

  private initializeRules(customRules?: Record<string, ScoringRule>) {
    Object.entries(this.defaultRules).forEach(([key, rule]) => {
      this.rules.set(key, rule);
    });

    if (customRules) {
      Object.entries(customRules).forEach(([key, rule]) => {
        this.rules.set(key, rule);
      });
    }
  }

  score(ad: VehicleAd): ScoringResult {
    let totalScore = 0;
    const reasons: string[] = [];
    const enabledRules = Array.from(this.rules.values()).filter((r) => r.enabled);
    const totalWeight = enabledRules.reduce((sum, r) => sum + r.weight, 0);

    const price = ad.price ? parseFloat(String(ad.price)) : undefined;

    if (this.rules.get("priceBelow")?.enabled) {
      const rule = this.rules.get("priceBelow")!;
      const targetPrice = rule.config?.targetPrice || 50000;
      if (price && price < targetPrice) {
        const points = (rule.weight / totalWeight) * 100;
        totalScore += points;
        reasons.push(`Preço abaixo de R$ ${targetPrice}`);
      }
    }

    if (this.rules.get("recentAd")?.enabled) {
      const rule = this.rules.get("recentAd")!;
      const maxDaysOld = rule.config?.maxDaysOld || 3;
      if (ad.collectedAt) {
        const daysOld = Math.floor((Date.now() - ad.collectedAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOld <= maxDaysOld) {
          const points = (rule.weight / totalWeight) * 100;
          totalScore += points;
          reasons.push(`Anúncio recente (${daysOld} dias)`);
        }
      }
    }

    if (this.rules.get("urgencySignals")?.enabled) {
      const signals = detectUrgencySignals(ad.description || undefined);
      if (signals.length > 0) {
        const rule = this.rules.get("urgencySignals")!;
        const points = (rule.weight / totalWeight) * 100 * Math.min(signals.length / 2, 1);
        totalScore += points;
        reasons.push(`Sinais de urgência: ${signals.join(", ")}`);
      }
    }

    if (this.rules.get("lowMileage")?.enabled) {
      const rule = this.rules.get("lowMileage")!;
      const maxMileage = rule.config?.maxMileage || 100000;
      if (ad.mileage && ad.mileage < maxMileage) {
        const points = (rule.weight / totalWeight) * 100;
        totalScore += points;
        reasons.push(`Quilometragem baixa (${ad.mileage} km)`);
      }
    }

    if (this.rules.get("individualSeller")?.enabled) {
      if (ad.sellerType === "individual") {
        const rule = this.rules.get("individualSeller")!;
        const points = (rule.weight / totalWeight) * 100;
        totalScore += points;
        reasons.push("Vendedor particular");
      }
    }

    if (this.rules.get("photoCount")?.enabled) {
      const rule = this.rules.get("photoCount")!;
      const minPhotos = rule.config?.minPhotos || 5;
      if (ad.photoCount && ad.photoCount >= minPhotos) {
        const points = (rule.weight / totalWeight) * 100;
        totalScore += points;
        reasons.push(`Muitas fotos (${ad.photoCount})`);
      }
    }

    const priority = this.determinePriority(totalScore);

    return {
      score: Math.round(totalScore * 100) / 100,
      priority,
      reasons,
    };
  }

  private determinePriority(score: number): "high" | "medium" | "low" {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  updateRule(ruleKey: string, updates: Partial<ScoringRule>) {
    const rule = this.rules.get(ruleKey);
    if (rule) {
      this.rules.set(ruleKey, { ...rule, ...updates });
    }
  }

  getRules(): Record<string, ScoringRule> {
    const result: Record<string, ScoringRule> = {};
    this.rules.forEach((rule, key) => {
      result[key] = rule;
    });
    return result;
  }
}
