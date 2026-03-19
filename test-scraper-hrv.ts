import 'dotenv/config';
import { CollectionService } from './server/services/collectionService';

async function testHRVCollection() {
    const service = new CollectionService();
    const options = {
        userId: 1,
        searchParams: {
            brand: "Honda",
            model: "HRV",
            state: "SP",
            maxPrice: "150000",
            visibleBrowser: false
        }
    };

    console.log("--- Starting HRV Collection Test ---");
    const result = await service.collect(options);
    console.log("--- Collection result ---");
    console.log(JSON.stringify(result, null, 2));
}

testHRVCollection().catch(console.error);
