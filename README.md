# easylease-api

> REST API for EasyLease - Property Management Platform

## Architecture

EasyLease uses a **contract-centric architecture** where the `Contract` model is the central entity linking `Tenant`, `Listing`, and `Owner` together.

**Key Principles:**
- ✅ Tenants are linked to properties via Contracts
- ✅ All lease information (dates, rent, terms) lives in Contracts
- ✅ Historical data is preserved through contract records
- ❌ No direct tenant-to-listing relationships

📖 **[Read Full Data Model Documentation](../docs/DATA_MODEL.md)**

---

## Quick start

1. Copy example env and fill values:

   ```bash
   cp .env.example .env.local
   # edit .env.local
   ```

2. Install dependencies and run:

   ```bash
   npm install
   npm run dev
   ```

3. API defaults to port in `.env.local` (4000)

---

## Core Entities

- **Owner** - Property owners
- **Listing** - Properties available for rent
- **Tenant** - Individuals renting properties
- **Contract** ⭐ - Links Tenant + Listing + Owner (central entity)
- **Lead** - Potential tenants/inquiries

---

## Key API Endpoints

### Tenants
- `GET /api/tenants` - List all tenants (with contract & listing data)
- `GET /api/tenants/:id` - Get tenant details
- `POST /api/tenants` - Create tenant (auto-creates contract if listing provided)
- `PUT /api/tenants/:id` - Update tenant info

### Contracts
- `GET /api/contracts` - List all contracts
- `GET /api/contracts/:id` - Get contract details
- `POST /api/contracts` - Create new contract
- `PUT /api/contracts/:id` - Update contract
- `PUT /api/contracts/:id/terminate` - Terminate contract

### Listings
- `GET /api/listings` - List properties
- `POST /api/listings` - Create property
- `PUT /api/listings/:id` - Update property

### Dashboard
- `GET /api/dashboard/stats` - Get role-based statistics
  - Manager: All system stats
  - Owner: Their properties and tenants
  - Tenant: Their current lease info

---

## Database Scripts

### Migration
```bash
# Migrate legacy tenant data to contracts
node scripts/migrate-tenants-to-contracts.js
```

### Verification
```bash
# Check database consistency
node scripts/check-db-consistency.js

# Verify tenant refactor
node scripts/verify-tenant-refactor.js

# Verify dashboard stats
node scripts/verify-dashboard-stats.js
```

---

## Documentation

- **[DATA_MODEL.md](../docs/DATA_MODEL.md)** - Complete data model and architecture guide
- **[API Endpoints](../docs/DATA_MODEL.md#api-endpoints)** - Detailed endpoint documentation
- **[Best Practices](../docs/DATA_MODEL.md#best-practices)** - Development guidelines

---

## Notes
- Do NOT commit `.env.local` or any real secrets.
- For CI/CD or deployments, set environment variables in your provider or GitHub Actions secrets.
- Always create contracts when linking tenants to properties.
- Use contract population to access tenant's property details.