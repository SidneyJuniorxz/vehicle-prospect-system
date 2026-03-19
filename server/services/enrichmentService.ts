import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../_core/env";

export interface EnrichedAdData {
    brand?: string;
    model?: string;
    version?: string;
    year?: number;
    price?: number;
    mileage?: number;
    city?: string;
    state?: string;
    sellerType?: "individual" | "dealer" | "reseller" | "unknown";
    confidence: number;
    reasoning?: string;
}

export class EnrichmentService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || "";
        if (!apiKey) {
            console.warn("[EnrichmentService] GEMINI_API_KEY not found in environment.");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async enrichAd(title: string, description: string): Promise<EnrichedAdData | null> {
        if (!process.env.GEMINI_API_KEY) return null;

        const prompt = `
      Você é um especialista em mercado automotivo brasileiro. 
      Analise o TÍTULO e a DESCRIÇÃO de um anúncio de veículo abaixo e extraia as informações estruturadas em JSON.
      
      TÍTULO: "${title}"
      DESCRIÇÃO: "${description}"
      
      Retorne APENAS um objeto JSON com os seguintes campos:
      {
        "brand": string (ex: "Fiat", "Volkswagen", "Honda"),
        "model": string (ex: "Uno", "Gol", "Civic", "HR-V"),
        "version": string (ex: "1.0 MPI", "Highline", "EXL"),
        "year": number (ano do modelo),
        "price": number (apenas números, ex: 45000),
        "mileage": number (em km, apenas números),
        "city": string,
        "state": string (sigla, ex: "SP"),
        "sellerType": "individual" | "dealer" | "reseller" | "unknown",
        "confidence": number (de 0 a 1),
        "reasoning": string (breve explicação do porquê dessa classificação)
      }
      
      Se não tiver certeza de algum campo, deixe como null ou "unknown".
      Responda apenas com o JSON puro, sem markdown ou explicações fora do JSON.
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Basic cleaning of potential markdown
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();

            const data = JSON.parse(text) as EnrichedAdData;
            return data;
        } catch (error) {
            console.error("[EnrichmentService] Error enriching ad:", error);
            return null;
        }
    }
}

let _enrichmentService: EnrichmentService | null = null;

export function getEnrichmentService() {
    if (!_enrichmentService) {
        _enrichmentService = new EnrichmentService();
    }
    return _enrichmentService;
}
