# Quick Start: Deploy to GitHub & Render (5 Minutes)

## TL;DR - Fast Track

### 1. Create GitHub Repository

```bash
# Go to https://github.com/new
# Create repository: "vehicle-prospect-system"
# Copy the HTTPS URL
```

### 2. Push Code to GitHub

```bash
cd /home/ubuntu/vehicle_prospect_system

git remote add origin https://github.com/YOUR_USERNAME/vehicle-prospect-system.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Render

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Blueprint"
4. Select your `vehicle-prospect-system` repository
5. Render auto-detects `render.yaml` and deploys automatically
6. Wait 5-10 minutes for deployment
7. Click "Visit" to open your app

### 4. Set Up Database

In Render Dashboard:
1. Go to your deployed service
2. Open "Shell" tab
3. Run: `pnpm db:push`
4. Done! Your database is ready

---

## What You Get

✅ **Free Hosting**: Render free tier (750 hours/month)
✅ **Free Database**: PostgreSQL 256MB
✅ **Auto-Deploy**: Push to GitHub → Auto-deploys to Render
✅ **HTTPS**: Free SSL certificate
✅ **Custom Domain**: Optional (add later)

---

## URLs After Deployment

- **App URL**: `https://vehicle-prospect-system.onrender.com`
- **GitHub**: `https://github.com/YOUR_USERNAME/vehicle-prospect-system`
- **Render Dashboard**: `https://dashboard.render.com`

---

## Test Your Deployment

1. Open app URL in browser
2. Go to `/login`
3. Click "Create Account"
4. Register test user
5. Login and verify dashboard works

---

## Troubleshooting

### Build Failed?
- Check Render logs: Dashboard → Service → Logs
- Verify `pnpm` is installed: `npm install -g pnpm`

### Database Error?
- Run migrations: `pnpm db:push` in Render Shell
- Check connection string in Environment variables

### App Won't Start?
- Check logs for errors
- Verify all environment variables are set
- Make sure database migrations completed

---

## Next Steps

1. **Monitor Logs**: Check Render dashboard daily for first week
2. **Add Custom Domain**: Update DNS to point to Render
3. **Set Up Backups**: Configure database backups
4. **Plan Scaling**: Upgrade from free tier as traffic grows

---

## Detailed Guides

- Full deployment guide: See `GITHUB_DEPLOYMENT.md`
- User management: See `USER_MANAGEMENT.md`
- System architecture: See `README.md`

---

**Time to Deploy**: ~5 minutes
**Cost**: Free (forever on free tier)
**Support**: Check Render docs at render.com/docs
