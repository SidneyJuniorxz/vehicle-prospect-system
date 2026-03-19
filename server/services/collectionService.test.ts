import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollectionService } from './collectionService';
import * as db from '../db';
import { getScraperRegistry } from '../scrapers/scraperRegistry';
import { getHealthMonitor } from './healthMonitorService';

// Mock dependencies
vi.mock('../db', () => ({
    createVehicleAd: vi.fn(),
    getVehicleAdByExternalId: vi.fn(),
    createLead: vi.fn(),
    logActivity: vi.fn(),
    createNotification: vi.fn(),
}));

vi.mock('../scrapers/scraperRegistry', () => {
    const mockRegistry = {
        searchAll: vi.fn(),
        getEnabledScrapers: vi.fn(() => [{ getConfig: () => ({ source: 'mock_source' }) }])
    };
    return {
        getScraperRegistry: vi.fn(() => mockRegistry)
    };
});

vi.mock('./healthMonitorService', () => {
    const mockMonitor = {
        recordSuccess: vi.fn(),
        recordError: vi.fn()
    };
    return {
        getHealthMonitor: vi.fn(() => mockMonitor)
    };
});

describe('CollectionService', () => {
    let collectionService: CollectionService;

    beforeEach(() => {
        vi.clearAllMocks();
        collectionService = new CollectionService();
    });

    it('should successfully collect ads and create leads', async () => {
        const mockAds = [
            {
                externalId: '123',
                source: 'mock_source',
                url: 'http://test.com/123',
                title: 'Test Car',
                price: 50000,
                year: 2020
            }
        ];

        const registry = getScraperRegistry();
        (registry.searchAll as any).mockResolvedValue(mockAds);
        (db.getVehicleAdByExternalId as any).mockResolvedValue(null);
        (db.createVehicleAd as any).mockResolvedValue([{ insertId: 1 }]);
        (db.createLead as any).mockResolvedValue([{ insertId: 1 }]);

        const result = await collectionService.collect({
            userId: 1,
            searchParams: {}
        });

        expect(result.totalCollected).toBe(1);
        expect(result.totalDuplicates).toBe(0);
        expect(result.leadsCreated).toBe(1);

        expect(db.createVehicleAd).toHaveBeenCalledTimes(1);
        expect(db.createLead).toHaveBeenCalledTimes(1);
        expect(db.logActivity).toHaveBeenCalledTimes(1);

        const monitor = getHealthMonitor();
        expect(monitor.recordSuccess).toHaveBeenCalled();
    });

    it('should identify duplicates and skip them', async () => {
        const mockAds = [
            {
                externalId: '123',
                source: 'mock_source',
                url: 'http://test.com/123',
                title: 'Test Car'
            }
        ];

        const registry = getScraperRegistry();
        (registry.searchAll as any).mockResolvedValue(mockAds);
        // Duplicate exists
        (db.getVehicleAdByExternalId as any).mockResolvedValue({ id: 1 });

        const result = await collectionService.collect({
            userId: 1,
            searchParams: {}
        });

        expect(result.totalCollected).toBe(1);
        expect(result.totalDuplicates).toBe(1);
        expect(result.leadsCreated).toBe(0);
        expect(db.createVehicleAd).not.toHaveBeenCalled();
    });

    it('should handle searchAll failures gracefully', async () => {
        const registry = getScraperRegistry();
        (registry.searchAll as any).mockRejectedValue(new Error('Network error'));

        const result = await collectionService.collect({
            userId: 1,
            searchParams: {}
        });

        expect(result.totalCollected).toBe(0);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Erro durante a busca');
    });
});
