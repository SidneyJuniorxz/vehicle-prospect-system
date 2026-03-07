# Vehicle Prospect System - Deployment Guide

## Overview

The Vehicle Prospect System supports **hybrid deployment**:
- **SaaS Mode**: Run on Manus platform (automatic hosting)
- **Self-Hosted Mode**: Run on your own server (Docker, VPS, Cloud)

This guide covers self-hosted deployment.

---

## Quick Start (Docker)

### Prerequisites
- Docker & Docker Compose installed
- 2GB RAM minimum
- 10GB disk space

### 1. Clone Repository
```bash
git clone <repository-url>
cd vehicle_prospect_system
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
nano .env
```

Key variables to set:
```env
DEPLOYMENT_MODE=self-hosted
DATABASE_URL=mysql://prospect_user:prospect_password@db:3306/vehicle_prospect
JWT_SECRET=your-strong-secret-key-here
```

### 3. Start Services
```bash
docker-compose up -d
```

### 4. Initialize Database
```bash
docker-compose exec app pnpm db:push
```

### 5. Access Application
- **URL**: http://localhost:3000
- **API**: http://localhost:3000/api/rest
- **API Docs**: http://localhost:3000/api/rest/docs

---

## Manual Installation (No Docker)

### Prerequisites
- Node.js 18+ (LTS)
- MySQL 8.0+
- pnpm or npm

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Database
Create MySQL database:
```sql
CREATE DATABASE vehicle_prospect;
CREATE USER 'prospect_user'@'localhost' IDENTIFIED BY 'prospect_password';
GRANT ALL PRIVILEGES ON vehicle_prospect.* TO 'prospect_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Set Environment Variables
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Run Migrations
```bash
pnpm db:push
```

### 5. Build Application
```bash
pnpm build
```

### 6. Start Server
```bash
# Development
pnpm dev

# Production
NODE_ENV=production pnpm start
```

---

## Cloud Deployment

### AWS EC2

1. **Launch Instance**
   - Ubuntu 22.04 LTS
   - t3.medium (2GB RAM)
   - Security group: Allow ports 80, 443, 3000

2. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Deploy Application**
   ```bash
   git clone <repo>
   cd vehicle_prospect_system
   docker-compose up -d
   ```

4. **Setup Reverse Proxy (Nginx)**
   ```bash
   sudo apt install nginx
   # Configure nginx to proxy to localhost:3000
   ```

### Google Cloud Run

1. **Build Docker Image**
   ```bash
   docker build -t gcr.io/PROJECT_ID/vehicle-prospect:latest .
   docker push gcr.io/PROJECT_ID/vehicle-prospect:latest
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy vehicle-prospect \
     --image gcr.io/PROJECT_ID/vehicle-prospect:latest \
     --platform managed \
     --region us-central1 \
     --set-env-vars DEPLOYMENT_MODE=self-hosted
   ```

### DigitalOcean App Platform

1. **Connect Repository**
   - Link your GitHub repository

2. **Configure App Spec**
   ```yaml
   services:
   - name: vehicle-prospect
     github:
       repo: your-repo
       branch: main
     build_command: pnpm build
     run_command: pnpm start
     http_port: 3000
     envs:
     - key: DEPLOYMENT_MODE
       value: self-hosted
   ```

3. **Deploy**
   - Click Deploy

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEPLOYMENT_MODE` | Yes | `manus` | `manus` or `self-hosted` |
| `DATABASE_URL` | Yes | - | MySQL connection string |
| `JWT_SECRET` | Yes | - | Secret for JWT tokens |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `PORT` | No | `3000` | Server port |
| `ENABLE_REST_API` | No | `true` | Enable REST API |
| `ENABLE_EXPORT` | No | `true` | Enable data export |
| `ENABLE_SCHEDULING` | No | `true` | Enable job scheduling |

### Database Configuration

For production, use a managed database service:
- **AWS RDS**: MySQL 8.0
- **Google Cloud SQL**: MySQL 8.0
- **Azure Database for MySQL**: 8.0
- **DigitalOcean Managed Databases**: MySQL 8.0

Update `DATABASE_URL`:
```
mysql://user:password@host:3306/database
```

---

## Monitoring & Maintenance

### Health Check
```bash
curl http://localhost:3000/api/health
```

### View Logs
```bash
# Docker
docker-compose logs -f app

# Manual
tail -f ./logs/app.log
```

### Database Backup
```bash
# Docker
docker-compose exec db mysqldump -u prospect_user -p vehicle_prospect > backup.sql

# Manual
mysqldump -u prospect_user -p vehicle_prospect > backup.sql
```

### Database Restore
```bash
mysql -u prospect_user -p vehicle_prospect < backup.sql
```

---

## Scaling

### Horizontal Scaling (Multiple Instances)

1. **Load Balancer** (Nginx, AWS ALB)
   - Route traffic to multiple app instances

2. **Shared Database**
   - Use managed database service (RDS, Cloud SQL)

3. **Shared Storage** (Optional)
   - S3, Google Cloud Storage for exports

### Vertical Scaling

Increase instance resources:
- **RAM**: 2GB → 4GB → 8GB
- **CPU**: 1 core → 2 cores → 4 cores
- **Disk**: 10GB → 50GB → 100GB

---

## Security Best Practices

1. **Change Default Secrets**
   ```bash
   # Generate strong JWT secret
   openssl rand -base64 32
   ```

2. **Use HTTPS**
   - Get SSL certificate (Let's Encrypt)
   - Configure reverse proxy (Nginx)

3. **Database Security**
   - Use strong passwords
   - Restrict database access
   - Enable SSL for database connections

4. **API Security**
   - Enable rate limiting
   - Use API keys for external access
   - Implement CORS properly

5. **Regular Updates**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

---

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution**: Ensure MySQL is running and DATABASE_URL is correct

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Change PORT in .env or kill process using port 3000

### Out of Memory
```
JavaScript heap out of memory
```
**Solution**: Increase Node.js memory limit
```bash
NODE_OPTIONS=--max-old-space-size=2048 pnpm start
```

### Docker Build Fails
**Solution**: Clear Docker cache and rebuild
```bash
docker-compose down
docker system prune -a
docker-compose up --build
```

---

## Support & Resources

- **Documentation**: See README.md
- **API Docs**: http://localhost:3000/api/rest/docs
- **Issues**: GitHub Issues
- **Email**: support@vehicleprospect.com

---

## Next Steps

1. ✅ Deploy application
2. ✅ Configure scrapers
3. ✅ Set up scheduled jobs
4. ✅ Configure email notifications
5. ✅ Set up monitoring alerts
6. ✅ Create backup strategy
