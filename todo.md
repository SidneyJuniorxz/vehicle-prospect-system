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


## Phase 8: HTML Parsing Implementation
- [x] Install cheerio dependency
- [x] Implement OLX HTML parser with cheerio
- [x] Implement Mercado Livre HTML parser
- [x] Implement Webmotors HTML parser
- [x] Implement iCarros HTML parser
- [x] Implement SóCarrão HTML parser
- [ ] Test parsers with sample HTML
- [ ] Validate extracted data quality

## Phase 9: Scheduling System
- [x] Create collection job schema in database (placeholder)
- [x] Implement job scheduler service with node-cron
- [ ] Create tRPC procedures for job management
- [ ] Implement job execution and logging
- [ ] Add job history tracking
- [x] Create scheduling page in dashboard
- [x] Add job status monitoring

## Phase 10: Monitoring & Alerts
- [x] Create scraper health check service
- [x] Implement error rate tracking
- [x] Implement response time monitoring
- [x] Create alerts system
- [x] Create monitoring dashboard page
- [ ] Add email/notification alerts
- [ ] Implement health check API endpoint


## Phase 11: Hybrid Model Refactoring
- [x] Implement flexible authentication (Manus OAuth + JWT local)
- [x] Create auth middleware to detect deployment mode
- [ ] Refactor database layer for multi-tenant support
- [x] Add environment-based configuration system
- [ ] Update frontend to support both auth modes

## Phase 12: Export & Download Functionality
- [x] Implement CSV export with custom columns
- [x] Implement Excel export with formatting
- [x] Implement JSON export
- [ ] Add batch export functionality
- [ ] Create export scheduling/history

## Phase 13: REST API Implementation
- [x] Create REST API endpoints for leads
- [x] Create REST API endpoints for scrapers
- [x] Create REST API endpoints for exports
- [ ] Add API authentication (API keys)
- [x] Create API documentation (OpenAPI/Swagger)

## Phase 14: Real Data Testing
- [ ] Test OLX scraper with real HTML
- [ ] Test Mercado Livre scraper with real HTML
- [ ] Test Webmotors scraper with real HTML
- [ ] Test iCarros scraper with real HTML
- [ ] Test SóCarrão scraper with real HTML
- [ ] Validate data quality and completeness

## Phase 15: Docker & Deployment
- [x] Create Dockerfile for self-hosted
- [x] Create docker-compose.yml
- [ ] Create .dockerignore
- [x] Add deployment documentation
- [ ] Create setup script for self-hosted

## Phase 16: Licensing System
- [ ] Create license key generation system
- [ ] Implement license validation
- [ ] Add feature-based licensing (basic/pro/enterprise)
- [ ] Create license management dashboard
- [ ] Add trial period support

## Phase 17: Documentation & Monetization
- [ ] Create installation guide (self-hosted)
- [ ] Create SaaS setup guide (Manus)
- [x] Create API documentation
- [ ] Create pricing page
- [ ] Create user guide and tutorials
