# GitHub & Render.com Deployment Guide

## Overview

This guide explains how to deploy the Vehicle Prospect System to GitHub and Render.com (free tier).

---

## Prerequisites

1. **GitHub Account**: [github.com](https://github.com) (free)
2. **Render Account**: [render.com](https://render.com) (free tier available)
3. **Git installed**: `git --version`
4. **Node.js 18+**: `node --version`

---

## Step 1: Create GitHub Repository

### Option A: Using GitHub Web Interface

1. Go to [github.com/new](https://github.com/new)
2. Fill in repository details:
   - **Repository name**: `vehicle-prospect-system`
   - **Description**: "Vehicle ad lead generation and management platform"
   - **Visibility**: Public (for free tier)
   - **Initialize with**: Skip (we'll push existing code)
3. Click "Create repository"
4. Copy the repository URL (HTTPS or SSH)

### Option B: Using GitHub CLI

```bash
# Install GitHub CLI if not already installed
# macOS: brew install gh
# Linux: sudo apt install gh
# Windows: choco install gh

# Login to GitHub
gh auth login

# Create repository
gh repo create vehicle-prospect-system \
  --public \
  --source=. \
  --remote=origin \
  --push
```

---

## Step 2: Push Code to GitHub

### Initialize and Push

```bash
cd /home/ubuntu/vehicle_prospect_system

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Vehicle Prospect System MVP

- Multi-source vehicle ad scraper (OLX, Mercado Livre, Webmotors, iCarros, SóCarrão)
- Lead filtering and scoring engine
- Intelligent deduplication
- Web dashboard with data management
- Local authentication system
- REST API for integrations
- Docker support for self-hosted deployment"

# Add remote repository (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/vehicle-prospect-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Verify Push

```bash
git remote -v
# Should show:
# origin  https://github.com/YOUR_USERNAME/vehicle-prospect-system.git (fetch)
# origin  https://github.com/YOUR_USERNAME/vehicle-prospect-system.git (push)
```

---

## Step 3: Prepare for Render.com Deployment

### Create Render Configuration File

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: vehicle-prospect-system
    env: node
    plan: free
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: vehicle-prospect-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: VITE_APP_ID
        sync: false
      - key: VITE_APP_TITLE
        value: "Vehicle Prospect System"

databases:
  - name: vehicle-prospect-db
    databaseName: vehicle_prospect
    user: prospect_user
    plan: free
```

### Update package.json Scripts

Ensure these scripts exist in `package.json`:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
    "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "test": "vitest run",
    "db:push": "drizzle-kit generate && drizzle-kit migrate"
  }
}
```

### Create .env.production.example

```bash
# Copy .env.example to .env.production.example
cp .env.example .env.production.example
```

Edit `.env.production.example`:

```env
# Production Environment Variables
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-secret-key-here
VITE_APP_ID=your-app-id
VITE_APP_TITLE=Vehicle Prospect System
VITE_FRONTEND_FORGE_API_KEY=your-api-key
```

---

## Step 4: Deploy to Render.com

### Method 1: Using Render Dashboard (Recommended)

1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Click "New +" → "Web Service"
4. Select "Connect a repository" → Choose `vehicle-prospect-system`
5. Fill in deployment settings:
   - **Name**: `vehicle-prospect-system`
   - **Environment**: `Node`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: Free
6. Click "Create Web Service"

### Method 2: Using render.yaml (Infrastructure as Code)

1. Commit `render.yaml` to GitHub:
```bash
git add render.yaml
git commit -m "Add Render deployment configuration"
git push origin main
```

2. Go to [render.com/dashboard](https://render.com/dashboard)
3. Click "New +" → "Blueprint"
4. Select your GitHub repository
5. Render will auto-detect `render.yaml` and deploy

---

## Step 5: Configure Environment Variables

### In Render Dashboard

1. Go to your service settings
2. Click "Environment"
3. Add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `DATABASE_URL` | From database connection | Auto-set if using Render DB |
| `JWT_SECRET` | Generate random string | Use `openssl rand -base64 32` |
| `VITE_APP_ID` | Your app ID | From Manus or leave blank |
| `VITE_APP_TITLE` | `Vehicle Prospect System` | Display name |

### Generate Secure JWT Secret

```bash
# macOS/Linux
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

---

## Step 6: Database Setup

### Option A: Use Render's Free PostgreSQL

1. In Render Dashboard, click "New +" → "PostgreSQL"
2. Fill in details:
   - **Name**: `vehicle-prospect-db`
   - **Database**: `vehicle_prospect`
   - **User**: `prospect_user`
   - **Plan**: Free
3. Click "Create Database"
4. Copy connection string to web service environment

### Option B: Use External Database (Recommended for Production)

For better uptime, use a managed database service:

- **Neon** (PostgreSQL): [neon.tech](https://neon.tech) - Free tier
- **Supabase** (PostgreSQL): [supabase.com](https://supabase.com) - Free tier
- **Railway** (MySQL): [railway.app](https://railway.app) - Free tier

Example with Neon:
```bash
# Get connection string from Neon dashboard
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

---

## Step 7: Run Database Migrations

### After Deployment

1. In Render Dashboard, go to your service
2. Click "Shell" tab
3. Run migrations:

```bash
pnpm db:push
```

This will:
- Generate Drizzle migrations
- Apply schema to production database
- Create all tables and indexes

---

## Step 8: Verify Deployment

### Check Service Status

1. Go to Render Dashboard
2. Click on your service
3. Check "Logs" tab for any errors
4. Look for: `Server running on http://localhost:3000/`

### Test Application

1. Click "Visit" button to open deployed app
2. Test login page: `/login`
3. Test registration: `/register`
4. Create test user and verify dashboard loads

### Monitor Logs

```bash
# In Render Dashboard, click "Logs" to see:
- Build logs
- Deployment status
- Runtime errors
- Application output
```

---

## Step 9: Set Up Custom Domain (Optional)

### Using Render's Free Domain

Your app is automatically available at:
```
https://vehicle-prospect-system.onrender.com
```

### Using Custom Domain

1. Go to service settings → "Custom Domain"
2. Enter your domain (e.g., `vehicleprospect.com`)
3. Update DNS records at your domain registrar:
   - **CNAME**: Point to `vehicle-prospect-system.onrender.com`
4. Wait for DNS propagation (5-30 minutes)

---

## Troubleshooting

### Build Fails

**Error**: `pnpm: command not found`

**Solution**:
```bash
# Update buildCommand in render.yaml
buildCommand: npm install -g pnpm && pnpm install && pnpm build
```

### Database Connection Error

**Error**: `ECONNREFUSED` or `ER_ACCESS_DENIED_FOR_USER`

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Check database is running
3. Verify credentials match
4. Test connection locally first

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**: Render automatically assigns port via `process.env.PORT`

```javascript
// In server code
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
```

### Application Crashes on Startup

**Solution**:
1. Check logs in Render dashboard
2. Verify all environment variables are set
3. Ensure database migrations ran successfully
4. Check Node.js version compatibility

---

## Continuous Deployment

### Auto-Deploy on GitHub Push

Render automatically redeploys when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Render will automatically:
# 1. Detect push
# 2. Pull latest code
# 3. Run build command
# 4. Deploy new version
```

### Disable Auto-Deploy

1. Go to service settings
2. Click "Deploy"
3. Toggle "Auto-Deploy" off

---

## Monitoring & Maintenance

### View Logs

```bash
# In Render Dashboard
- Click service
- Click "Logs" tab
- Filter by date/time
```

### Monitor Performance

```bash
# In Render Dashboard
- Click "Metrics" tab
- View CPU, Memory, Bandwidth usage
```

### Update Dependencies

```bash
# Locally
pnpm update

# Commit and push
git add pnpm-lock.yaml
git commit -m "Update dependencies"
git push origin main

# Render will auto-deploy
```

### Backup Database

For free tier PostgreSQL on Render:
1. Go to database dashboard
2. Click "Backups"
3. Create manual backup before major changes

---

## Production Checklist

- [ ] GitHub repository created and code pushed
- [ ] Render account created and service deployed
- [ ] Database configured and migrations run
- [ ] Environment variables set correctly
- [ ] Application loads without errors
- [ ] Login/Register functionality works
- [ ] Dashboard displays data
- [ ] Logs monitored for errors
- [ ] Custom domain configured (optional)
- [ ] Backup strategy in place

---

## Next Steps

1. **Monitor Application**: Check logs daily for first week
2. **Set Up Alerts**: Configure email notifications for errors
3. **Plan Scaling**: As traffic grows, upgrade from free tier
4. **Add SSL Certificate**: Render provides free HTTPS automatically
5. **Document Deployment**: Keep this guide updated

---

## Support & Resources

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **GitHub Docs**: [docs.github.com](https://docs.github.com)
- **Node.js Docs**: [nodejs.org/docs](https://nodejs.org/docs)
- **Drizzle ORM**: [orm.drizzle.team](https://orm.drizzle.team)

---

## Cost Estimate

| Service | Free Tier | Cost |
|---------|-----------|------|
| Render Web Service | 750 hours/month | Free |
| Render PostgreSQL | 256 MB | Free |
| GitHub Repository | Unlimited | Free |
| Custom Domain | N/A | $10-15/year |
| **Total** | | **Free** |

---

**Last Updated**: March 2026
**Version**: 1.0.0
