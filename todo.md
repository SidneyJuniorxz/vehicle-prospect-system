# Vehicle Prospect System - TODO

## Phase 1: Database & Schema
- [x] Create database schema for ads, leads, filters, scoring rules, users, logs
- [x] Create database migrations with Drizzle
- [x] Setup relationships and indexes

## Phase 2: Core Backend Modules
- [x] Implement ad collector module (OLX, Mercado Livre scrapers)
- [x] Implement filter engine with configurable rules
- [x] Implement scoring engine with weighted factors
- [x] Implement deduplication logic (title similarity, image matching)
- [ ] Implement notification system (email + in-app)
- [x] Implement activity logging

## Phase 3: API & Integrations
- [x] Create tRPC procedures for ad management
- [x] Create tRPC procedures for filter configuration
- [x] Create tRPC procedures for scoring rules
- [x] Create tRPC procedures for notifications
- [ ] Create tRPC procedures for exports (CSV, Excel)
- [ ] Create tRPC procedures for activity logs
- [ ] Implement scheduled collection with cron

## Phase 4: Frontend Dashboard
- [x] Create leads table with sorting and pagination
- [x] Create dynamic filter panel
- [ ] Create lead detail view
- [ ] Create scoring configuration page
- [ ] Create user management page (admin only)
- [ ] Create activity logs page
- [ ] Create export functionality
- [x] Create notifications panel

## Phase 5: Testing & Validation
- [ ] Write vitest tests for core modules
- [ ] Test scrapers with real data
- [ ] Test filter and scoring logic
- [ ] Test deduplication
- [ ] Test export functionality
- [ ] Test multi-user access control

## Phase 6: Documentation & Deployment
- [x] Create setup instructions
- [ ] Create API documentation
- [ ] Create user guide
- [ ] Create configuration guide
- [ ] Prepare for production deployment


## Phase 7: Scraper Expansion - Multiple Sources
- [x] Create extensible scraper architecture with source plugins
- [x] Implement Webmotors scraper
- [x] Implement iCarros scraper
- [x] Implement SoCarrao scraper
- [x] Implement OLX scraper
- [x] Implement Mercado Livre scraper
- [x] Add ethical scraping: delays, user-agent rotation, robots.txt compliance
- [x] Create data source management interface (add/edit/remove sources)
- [ ] Implement proxy rotation (optional)
- [ ] Add scraper health monitoring and error handling
- [ ] Test scrapers with real data collection
- [ ] Validate data quality and completeness
- [x] Create comprehensive scraper documentation
