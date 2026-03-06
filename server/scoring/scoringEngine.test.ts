import { describe, it, expect } from "vitest";
import { ScoringEngine } from "./scoringEngine";
import type { VehicleAd } from "../../drizzle/schema";

describe("ScoringEngine", () => {
  const engine = new ScoringEngine();

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
    description: "Carro bem cuidado, urgente vender",
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

  it("should score an ad with multiple positive factors", () => {
    const ad = createMockAd({
      price: "32000",
      year: 2015,
      mileage: 85000,
      sellerType: "individual",
      photoCount: 8,
      description: "Urgente vender, preciso vender",
      collectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    });

    const result = engine.score(ad);

    expect(result.score).toBeGreaterThan(0);
    expect(result.priority).toBeDefined();
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("should assign high priority for excellent leads", () => {
    const ad = createMockAd({
      price: "25000",
      year: 2018,
      mileage: 50000,
      sellerType: "individual",
      photoCount: 10,
      description: "Urgente vender, preciso vender, aceito proposta",
      collectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const result = engine.score(ad);

    expect(result.priority).toBe("high");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("should assign low priority for poor leads", () => {
    const ad = createMockAd({
      price: "150000",
      year: 2005,
      mileage: 300000,
      sellerType: "dealer",
      photoCount: 2,
      description: "Vendo carro",
      collectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    });

    const result = engine.score(ad);

    expect(result.priority).toBe("low");
    expect(result.score).toBeLessThan(40);
  });

  it("should detect urgency signals in description", () => {
    const ad = createMockAd({
      description: "Urgente! Preciso vender hoje, aceito proposta",
    });

    const result = engine.score(ad);

    expect(result.reasons.some((r) => r.includes("urgência"))).toBe(true);
  });

  it("should reward recent ads", () => {
    const recentAd = createMockAd({
      collectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    });

    const oldAd = createMockAd({
      collectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    });

    const recentResult = engine.score(recentAd);
    const oldResult = engine.score(oldAd);

    expect(recentResult.score).toBeGreaterThan(oldResult.score);
  });

  it("should reward low mileage", () => {
    const lowMileageAd = createMockAd({ mileage: 50000 });
    const highMileageAd = createMockAd({ mileage: 200000 });

    const lowResult = engine.score(lowMileageAd);
    const highResult = engine.score(highMileageAd);

    expect(lowResult.score).toBeGreaterThan(highResult.score);
  });

  it("should reward individual sellers", () => {
    const individualAd = createMockAd({ sellerType: "individual" });
    const dealerAd = createMockAd({ sellerType: "dealer" });

    const individualResult = engine.score(individualAd);
    const dealerResult = engine.score(dealerAd);

    expect(individualResult.score).toBeGreaterThan(dealerResult.score);
  });

  it("should allow updating rules", () => {
    const engine2 = new ScoringEngine();
    engine2.updateRule("priceBelow", { enabled: false });

    const rules = engine2.getRules();
    expect(rules.priceBelow.enabled).toBe(false);
  });

  it("should handle null/undefined values gracefully", () => {
    const ad = createMockAd({
      price: null,
      mileage: undefined,
      description: null,
    });

    const result = engine.score(ad);

    expect(result.score).toBeDefined();
    expect(result.priority).toBeDefined();
  });
});
