import 'dotenv/config';
import { CollectionService } from './server/services/collectionService';

async function testArgoCollection() {
    const service = new CollectionService();
    const options = {
        userId: 1,
        searchParams: {
            brand: "Fiat",
            model: "Argo",
            state: "SP",
            maxPrice: "100000",
            visibleBrowser: false
        }
    };

    console.log("--- Starting Argo Collection Test ---");
    const result = await service.collect(options);
    console.log("--- Collection result ---");
    console.log(JSON.stringify(result, null, 2));
}

testArgoCollection().catch(console.error);
