import { describe, it, expect } from "vitest";
import { FilterEngine, type FilterCriteria } from "./filterEngine";
import type { VehicleAd } from "../../drizzle/schema";

describe("FilterEngine", () => {
  const createMockAd = (overrides: Partial<VehicleAd> = {}): VehicleAd => ({
    id: 1,
    externalId: "test_123",
    source: "olx",
    url: "https://example.com",
    title: "Fiat Uno 2015",
    brand: "Fiat",
    model: "Uno",
    version: "Mille",
    year: 2015,
    mileage: 85000,
    price: "32000",
    city: "São Paulo",
    state: "SP",
    sellerType: "individual",
    sellerName: "João",
    description: "Carro bem cuidado",
    photoCount: 8,
    photoUrls: null,
    adPostedAt: new Date(),
    collectedAt: new Date(),
    lastSeenAt: new Date(),
    isActive: true,
    hash: "abc123",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  it("should filter by price range", () => {
    const engine = new FilterEngine({
      minPrice: 30000,
      maxPrice: 40000,
    });

    const cheapAd = createMockAd({ price: "25000" });
    const goodAd = createMockAd({ price: "35000" });
    const expensiveAd = createMockAd({ price: "50000" });

    expect(engine.matches(cheapAd)).toBe(false);
    expect(engine.matches(goodAd)).toBe(true);
    expect(engine.matches(expensiveAd)).toBe(false);
  });

  it("should filter by year range", () => {
    const engine = new FilterEngine({
      minYear: 2015,
      maxYear: 2020,
    });

    const oldAd = createMockAd({ year: 2010 });
    const goodAd = createMockAd({ year: 2017 });
    const newAd = createMockAd({ year: 2022 });

    expect(engine.matches(oldAd)).toBe(false);
    expect(engine.matches(goodAd)).toBe(true);
    expect(engine.matches(newAd)).toBe(false);
  });

  it("should filter by mileage", () => {
    const engine = new FilterEngine({
      maxMileage: 100000,
    });

    const lowMileageAd = createMockAd({ mileage: 50000 });
    const highMileageAd = createMockAd({ mileage: 150000 });

    expect(engine.matches(lowMileageAd)).toBe(true);
    expect(engine.matches(highMileageAd)).toBe(false);
  });

  it("should filter by brand", () => {
    const engine = new FilterEngine({
      brands: ["fiat", "chevrolet"],
    });

    const fiatAd = createMockAd({ brand: "Fiat" });
    const chevroletAd = createMockAd({ brand: "Chevrolet" });
    const fordAd = createMockAd({ brand: "Ford" });

    expect(engine.matches(fiatAd)).toBe(true);
    expect(engine.matches(chevroletAd)).toBe(true);
    expect(engine.matches(fordAd)).toBe(false);
  });

  it("should filter by state", () => {
    const engine = new FilterEngine({
      states: ["SP", "RJ"],
    });

    const spAd = createMockAd({ state: "SP" });
    const rjAd = createMockAd({ state: "RJ" });
    const mgAd = createMockAd({ state: "MG" });

    expect(engine.matches(spAd)).toBe(true);
    expect(engine.matches(rjAd)).toBe(true);
    expect(engine.matches(mgAd)).toBe(false);
  });

  it("should filter by seller type", () => {
    const engine = new FilterEngine({
      sellerTypes: ["individual"],
    });

    const individualAd = createMockAd({ sellerType: "individual" });
    const dealerAd = createMockAd({ sellerType: "dealer" });

    expect(engine.matches(individualAd)).toBe(true);
    expect(engine.matches(dealerAd)).toBe(false);
  });

  it("should filter by required keywords", () => {
    const engine = new FilterEngine({
      requiredKeywords: ["urgente", "vender"],
    });

    const matchingAd = createMockAd({
      description: "Urgente! Preciso vender este carro",
    });
    const nonMatchingAd = createMockAd({
      description: "Carro em bom estado",
    });

    expect(engine.matches(matchingAd)).toBe(true);
    expect(engine.matches(nonMatchingAd)).toBe(false);
  });

  it("should filter by excluded keywords", () => {
    const engine = new FilterEngine({
      excludedKeywords: ["leilão", "sinistrado"],
    });

    const goodAd = createMockAd({
      description: "Carro bem cuidado",
    });
    const badAd = createMockAd({
      description: "Carro sinistrado, leilão",
    });

    expect(engine.matches(goodAd)).toBe(true);
    expect(engine.matches(badAd)).toBe(false);
  });

  it("should filter by photo count", () => {
    const engine = new FilterEngine({
      minPhotoCount: 5,
    });

    const fewPhotosAd = createMockAd({ photoCount: 3 });
    const manyPhotosAd = createMockAd({ photoCount: 10 });

    expect(engine.matches(fewPhotosAd)).toBe(false);
    expect(engine.matches(manyPhotosAd)).toBe(true);
  });

  it("should filter by ad age", () => {
    const engine = new FilterEngine({
      maxDaysOld: 3,
    });

    const recentAd = createMockAd({
      collectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    });
    const oldAd = createMockAd({
      collectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    });

    expect(engine.matches(recentAd)).toBe(true);
    expect(engine.matches(oldAd)).toBe(false);
  });

  it("should apply multiple filters together", () => {
    const engine = new FilterEngine({
      minPrice: 30000,
      maxPrice: 40000,
      minYear: 2015,
      states: ["SP"],
      sellerTypes: ["individual"],
    });

    const goodAd = createMockAd({
      price: "35000",
      year: 2017,
      state: "SP",
      sellerType: "individual",
    });

    const badAd = createMockAd({
      price: "35000",
      year: 2017,
      state: "RJ", // Wrong state
      sellerType: "individual",
    });

    expect(engine.matches(goodAd)).toBe(true);
    expect(engine.matches(badAd)).toBe(false);
  });

  it("should update criteria dynamically", () => {
    const engine = new FilterEngine({
      minPrice: 30000,
    });

    expect(engine.matches(createMockAd({ price: "25000" }))).toBe(false);

    engine.updateCriteria({ minPrice: 20000 });

    expect(engine.matches(createMockAd({ price: "25000" }))).toBe(true);
  });

  it("should apply filters to multiple ads", () => {
    const engine = new FilterEngine({
      minPrice: 30000,
      maxPrice: 40000,
    });

    const ads = [
      createMockAd({ price: "25000" }),
      createMockAd({ price: "35000" }),
      createMockAd({ price: "45000" }),
    ];

    const filtered = engine.apply(ads);

    expect(filtered.length).toBe(1);
    expect(filtered[0].price).toBe("35000");
  });
});
