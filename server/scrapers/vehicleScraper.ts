import crypto from "crypto";

export interface ScrapedVehicleAd {
  externalId: string;
  source: "olx" | "mercado_livre" | "manual" | "api";
  url?: string;
  title: string;
  brand?: string;
  model?: string;
  version?: string;
  year?: number;
  mileage?: number;
  price?: number;
  city?: string;
  state?: string;
  sellerType?: "individual" | "dealer" | "reseller" | "unknown";
  sellerName?: string;
  description?: string;
  photoCount?: number;
  photoUrls?: string[];
  adPostedAt?: Date;
}

export function generateAdHash(ad: ScrapedVehicleAd): string {
  const key = `${ad.title}|${ad.price}|${ad.city}|${ad.state}`;
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function scrapeOLX(searchParams: {
  brand?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  state?: string;
  city?: string;
}): Promise<ScrapedVehicleAd[]> {
  console.log("[OLX Scraper] Starting collection with params:", searchParams);

  const mockAds: ScrapedVehicleAd[] = [
    {
      externalId: "olx_12345",
      source: "olx",
      url: "https://www.olx.com.br/autos/carros/sao-paulo/...",
      title: "Fiat Uno 2015 Branco - Excelente Estado",
      brand: "Fiat",
      model: "Uno",
      version: "Mille",
      year: 2015,
      mileage: 85000,
      price: 32000,
      city: "São Paulo",
      state: "SP",
      sellerType: "individual",
      sellerName: "João Silva",
      description: "Carro muito bem cuidado, revisado, urgente vender",
      photoCount: 8,
      adPostedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  return mockAds;
}

export async function scrapeMercadoLivre(searchParams: {
  brand?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  state?: string;
  city?: string;
}): Promise<ScrapedVehicleAd[]> {
  console.log("[Mercado Livre Scraper] Starting collection with params:", searchParams);

  const mockAds: ScrapedVehicleAd[] = [
    {
      externalId: "ml_67890",
      source: "mercado_livre",
      url: "https://www.mercadolivre.com.br/...",
      title: "Chevrolet Corsa 2012 Prata - Aceito Proposta",
      brand: "Chevrolet",
      model: "Corsa",
      version: "Classic",
      year: 2012,
      mileage: 125000,
      price: 28000,
      city: "Rio de Janeiro",
      state: "RJ",
      sellerType: "individual",
      sellerName: "Maria Santos",
      description: "Preciso vender urgente, abaixo da FIPE, aceito proposta",
      photoCount: 12,
      adPostedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  return mockAds;
}

export async function scrapeAllSources(searchParams: any): Promise<ScrapedVehicleAd[]> {
  try {
    const [olxAds, mlAds] = await Promise.all([
      scrapeOLX(searchParams),
      scrapeMercadoLivre(searchParams),
    ]);

    return [...olxAds, ...mlAds];
  } catch (error) {
    console.error("[Scraper] Error during collection:", error);
    throw error;
  }
}

export function detectSellerType(ad: ScrapedVehicleAd): "individual" | "dealer" | "reseller" | "unknown" {
  const description = (ad.description || "").toLowerCase();
  const sellerName = (ad.sellerName || "").toLowerCase();

  if (
    description.includes("loja") ||
    description.includes("concessionária") ||
    sellerName.includes("auto") ||
    sellerName.includes("motors")
  ) {
    return "dealer";
  }

  if (
    description.includes("revenda") ||
    description.includes("compro") ||
    description.includes("vendo")
  ) {
    return "reseller";
  }

  return ad.sellerType || "unknown";
}

export function detectUrgencySignals(description?: string): string[] {
  if (!description) return [];

  const urgencyKeywords = [
    "urgente",
    "preciso vender",
    "vendo rápido",
    "baixei o preço",
    "abaixo da fipe",
    "aceito proposta",
    "preciso urgente",
    "venda rápida",
    "liquidação",
  ];

  const signals: string[] = [];
  const lowerDesc = description.toLowerCase();

  for (const keyword of urgencyKeywords) {
    if (lowerDesc.includes(keyword)) {
      signals.push(keyword);
    }
  }

  return signals;
}
