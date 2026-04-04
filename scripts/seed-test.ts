import { getDb } from "../server/db";
import { vehicleAds, leads } from "../drizzle/schema";
import { generateAdHash } from "../server/scrapers/vehicleScraper";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Não foi possível conectar ao banco.");
    return;
  }

  console.log("Inserindo anúncio de teste...");
  
  const testAd = {
    externalId: "teste_" + Date.now(),
    source: "olx" as const,
    url: "https://www.olx.com.br/teste",
    title: "Viatura de Teste - Dashboard Corrigido",
    brand: "Fiat",
    model: "Uno",
    year: 2015,
    price: "35000",
    city: "São Paulo",
    state: "SP",
    contactInfo: "11999999999",
    hash: "hash_teste_" + Date.now(),
  };

  const [insertedAd] = await db.insert(vehicleAds).values(testAd).returning();
  console.log("Anúncio inserido ID:", insertedAd.id);

  console.log("Sucesso! Verifique o Dashboard agora.");
  process.exit(0);
}

main().catch(console.error);
