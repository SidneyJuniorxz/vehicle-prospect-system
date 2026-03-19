import type { VehicleAd } from "../../drizzle/schema";
import { BaseScraper } from "../scrapers/baseScraper";

export interface FilterCriteria {
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  brands?: string[];
  models?: string[];
  states?: string[];
  cities?: string[];
  sellerTypes?: string[];
  minPhotoCount?: number;
  maxDaysOld?: number;
  requiredKeywords?: string[];
  excludedKeywords?: string[];
  minDescriptionLength?: number;
}

export class FilterEngine {
  private criteria: FilterCriteria;

  constructor(criteria: FilterCriteria = {}) {
    this.criteria = criteria;
  }

  apply(ads: VehicleAd[]): VehicleAd[] {
    return ads.filter((ad) => this.matches(ad));
  }

  matches(ad: VehicleAd): boolean {
    const price = ad.price ? parseFloat(String(ad.price)) : undefined;

    if (this.criteria.minPrice !== undefined && price && price < this.criteria.minPrice) {
      console.log(`[Filter] Price ${price} < min ${this.criteria.minPrice}`);
      return false;
    }

    if (this.criteria.maxPrice !== undefined && price && price > this.criteria.maxPrice) {
      console.log(`[Filter] Price ${price} > max ${this.criteria.maxPrice}`);
      return false;
    }

    if (this.criteria.minYear !== undefined && ad.year && ad.year < this.criteria.minYear) {
      console.log(`[Filter] Year ${ad.year} < min ${this.criteria.minYear}`);
      return false;
    }

    if (this.criteria.maxYear !== undefined && ad.year && ad.year > this.criteria.maxYear) {
      console.log(`[Filter] Year ${ad.year} > max ${this.criteria.maxYear}`);
      return false;
    }

    if (this.criteria.maxMileage !== undefined && ad.mileage && ad.mileage > this.criteria.maxMileage) {
      console.log(`[Filter] Mileage ${ad.mileage} > max ${this.criteria.maxMileage}`);
      return false;
    }

    if (this.criteria.brands && this.criteria.brands.length > 0) {
      const adBrandNorm = BaseScraper.normalizeString(ad.brand || "", true);
      const brandMatch = this.criteria.brands.some(b => {
        const criteriaBrandNorm = BaseScraper.normalizeString(b, true);
        return adBrandNorm.includes(criteriaBrandNorm) || criteriaBrandNorm.includes(adBrandNorm);
      });
      if (!brandMatch) {
        console.log(`[Filter] Brand mismatch: Got "${ad.brand}" (norm: ${adBrandNorm}), expected one of [${this.criteria.brands}]`);
        return false;
      }
    }

    if (this.criteria.models && this.criteria.models.length > 0) {
      const adModelNorm = BaseScraper.normalizeString(ad.model || "", true);
      const modelMatch = this.criteria.models.some(m => {
        const criteriaModelNorm = BaseScraper.normalizeString(m, true);
        return adModelNorm.includes(criteriaModelNorm) || criteriaModelNorm.includes(adModelNorm);
      });
      if (!modelMatch) {
        console.log(`[Filter] Model mismatch: Got "${ad.model}" (norm: ${adModelNorm}), expected one of [${this.criteria.models}]`);
        return false;
      }
    }

    if (this.criteria.states && this.criteria.states.length > 0) {
      if (!ad.state || !this.criteria.states.includes(ad.state.toUpperCase())) {
        return false;
      }
    }

    if (this.criteria.cities && this.criteria.cities.length > 0) {
      if (!ad.city || !this.criteria.cities.includes(ad.city.toLowerCase())) {
        return false;
      }
    }

    if (this.criteria.sellerTypes && this.criteria.sellerTypes.length > 0) {
      if (!ad.sellerType || !this.criteria.sellerTypes.includes(ad.sellerType)) {
        return false;
      }
    }

    if (this.criteria.minPhotoCount !== undefined && ad.photoCount && ad.photoCount < this.criteria.minPhotoCount) {
      return false;
    }

    if (this.criteria.maxDaysOld !== undefined && ad.collectedAt) {
      const daysOld = Math.floor((Date.now() - ad.collectedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOld > this.criteria.maxDaysOld) {
        return false;
      }
    }

    if (this.criteria.minDescriptionLength !== undefined && ad.description) {
      if (ad.description.length < this.criteria.minDescriptionLength) {
        return false;
      }
    }

    const description = (ad.description || "").toLowerCase();
    const title = (ad.title || "").toLowerCase();
    const fullText = `${title} ${description}`;

    if (this.criteria.requiredKeywords && this.criteria.requiredKeywords.length > 0) {
      const hasAllKeywords = this.criteria.requiredKeywords.every((keyword) =>
        fullText.includes(keyword.toLowerCase())
      );
      if (!hasAllKeywords) {
        return false;
      }
    }

    if (this.criteria.excludedKeywords && this.criteria.excludedKeywords.length > 0) {
      const hasExcludedKeyword = this.criteria.excludedKeywords.some((keyword) =>
        fullText.includes(keyword.toLowerCase())
      );
      if (hasExcludedKeyword) {
        return false;
      }
    }

    return true;
  }

  updateCriteria(newCriteria: Partial<FilterCriteria>) {
    this.criteria = { ...this.criteria, ...newCriteria };
  }

  getCriteria(): FilterCriteria {
    return { ...this.criteria };
  }
}
