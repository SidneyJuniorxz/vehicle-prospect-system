import type { VehicleAd } from "../../drizzle/schema";
import { generateAdHash } from "../scrapers/vehicleScraper";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedAdId?: number;
  similarity: number;
  reason?: string;
}

export class DeduplicationEngine {
  private existingAds: Map<string, VehicleAd> = new Map();

  constructor(existingAds: VehicleAd[] = []) {
    this.indexAds(existingAds);
  }

  private indexAds(ads: VehicleAd[]) {
    ads.forEach((ad) => {
      if (ad.hash) {
        this.existingAds.set(ad.hash, ad);
      }
    });
  }

  checkDuplicate(newAd: VehicleAd): DuplicateCheckResult {
    const hash = generateAdHash({
      title: newAd.title,
      price: newAd.price ? parseFloat(String(newAd.price)) : undefined,
      city: newAd.city || undefined,
      state: newAd.state || undefined,
    } as any);

    if (this.existingAds.has(hash)) {
      const existingAd = this.existingAds.get(hash)!;
      return {
        isDuplicate: true,
        matchedAdId: existingAd.id,
        similarity: 1.0,
        reason: "Exact hash match (same title, price, location)",
      };
    }

    const similarAds = this.findSimilarAds(newAd);
    if (similarAds.length > 0) {
      const bestMatch = similarAds[0];
      return {
        isDuplicate: bestMatch.similarity > 0.85,
        matchedAdId: bestMatch.similarity > 0.85 ? bestMatch.ad.id : undefined,
        similarity: bestMatch.similarity,
        reason: bestMatch.reason,
      };
    }

    return {
      isDuplicate: false,
      similarity: 0,
    };
  }

  private findSimilarAds(newAd: VehicleAd, threshold = 0.75): Array<{ ad: VehicleAd; similarity: number; reason: string }> {
    const candidates: Array<{ ad: VehicleAd; similarity: number; reason: string }> = [];

    this.existingAds.forEach((existingAd) => {
      const similarity = this.calculateSimilarity(newAd, existingAd);
      if (similarity >= threshold) {
        candidates.push({
          ad: existingAd,
          similarity,
          reason: `Similar ad found (${Math.round(similarity * 100)}% match)`,
        });
      }
    });

    return candidates.sort((a, b) => b.similarity - a.similarity);
  }

  private calculateSimilarity(ad1: VehicleAd, ad2: VehicleAd): number {
    let matches = 0;
    let totalFactors = 0;

    const checkMatch = (val1: any, val2: any, weight = 1): number => {
      totalFactors += weight;
      if (val1 === val2) {
        matches += weight;
        return 1;
      }
      return 0;
    };

    checkMatch(ad1.brand, ad2.brand, 2);
    checkMatch(ad1.model, ad2.model, 2);
    checkMatch(ad1.year, ad2.year, 1.5);
    checkMatch(ad1.city, ad2.city, 1);
    checkMatch(ad1.state, ad2.state, 0.5);

    const priceSimilarity = this.comparePrices(ad1.price, ad2.price);
    if (priceSimilarity > 0.9) {
      matches += 1.5;
    } else if (priceSimilarity > 0.7) {
      matches += 0.5;
    }
    totalFactors += 1.5;

    const titleSimilarity = this.compareStrings(ad1.title, ad2.title);
    if (titleSimilarity > 0.8) {
      matches += 1.5;
    } else if (titleSimilarity > 0.6) {
      matches += 0.5;
    }
    totalFactors += 1.5;

    return totalFactors > 0 ? matches / totalFactors : 0;
  }

  private comparePrices(price1: any, price2: any): number {
    if (!price1 || !price2) return 0;

    const p1 = parseFloat(String(price1));
    const p2 = parseFloat(String(price2));

    if (p1 === p2) return 1;

    const diff = Math.abs(p1 - p2);
    const avg = (p1 + p2) / 2;
    const percentDiff = diff / avg;

    if (percentDiff < 0.05) return 0.95;
    if (percentDiff < 0.1) return 0.85;
    if (percentDiff < 0.2) return 0.7;
    if (percentDiff < 0.5) return 0.5;

    return 0.2;
  }

  private compareStrings(str1: string | null, str2: string | null): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const costs: number[] = [];

    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }

    return costs[s2.length];
  }

  addAd(ad: VehicleAd) {
    const hash = generateAdHash({
      title: ad.title,
      price: ad.price ? parseFloat(String(ad.price)) : undefined,
      city: ad.city || undefined,
      state: ad.state || undefined,
    } as any);
    this.existingAds.set(hash, ad);
  }

  clearIndex() {
    this.existingAds.clear();
  }
}
