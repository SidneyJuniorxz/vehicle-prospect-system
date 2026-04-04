import { getDb } from "../server/db";
import { leads, vehicleAds } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Could not connect to database");
    process.exit(1);
  }
  const allLeads = await db.select().from(leads);
  const allAds = await db.select().from(vehicleAds);
  console.log("Leads count:", allLeads.length);
  console.log("Vehicle Ads count:", allAds.length);
  process.exit(0);
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
