# Deployment Guide

This guide walks through deploying Flight Price Intelligence Lab to production. It covers frontend (Vercel), backend options (Railway/Fly.io), database hosting, and CI/CD setup.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Backend Deployment Options](#backend-deployment-options)
- [Database Hosting](#database-hosting)
- [Environment Variables](#environment-variables)
- [CI/CD Setup](#cicd-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Production Stack
```
User → Vercel CDN (Frontend)
        ↓
     Backend API (Railway/Fly.io/Render)
        ↓
    PostgreSQL (Neon/Supabase/Railway)
        ↓
   Data Pipeline (GitHub Actions weekly)
```

### Components
- **Frontend:** Next.js on Vercel (free tier)
- **Backend:** FastAPI on Railway/Fly.io (free/hobby tier)
- **Database:** PostgreSQL on Neon/Supabase (free tier)
- **CI/CD:** GitHub Actions (free tier)

**Total cost:** $0-20/month (can run entirely on free tiers)

---

## Frontend Deployment (Vercel)

### Option 1: Automatic Deployment (Recommended)

**1. Create Vercel Account**
- Go to [vercel.com](https://vercel.com)
- Sign in with GitHub

**2. Import Repository**
- Dashboard → "Add New..." → "Project"
- Import `flight-price-intelligence-lab` repository

**3. Configure Build Settings**
```
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

**4. Add Environment Variables**
```
NEXT_PUBLIC_API_URL=https://your-backend-api.railway.app
```

**5. Deploy**
- Click "Deploy"
- Wait 2-3 minutes
- Your site is live! 🎉

**URL:** `https://flight-price-intelligence-lab-<random>.vercel.app`

---

### Option 2: Manual Deployment

**1. Install Vercel CLI**
```bash
npm install -g vercel
```

**2. Login**
```bash
vercel login
```

**3. Deploy from root directory**
```bash
cd /path/to/flight-price-intelligence-lab
vercel --prod
```

**4. Follow prompts**
- Project name: flight-price-intelligence-lab
- Link to existing project? No (first time)
- Which directory is Next.js in? `./frontend`

**5. Get deployment URL**
```
✅ Production: https://flight-price-intelligence-lab-abc123.vercel.app
```

---

### Configure Custom Domain (Optional)

**1. Buy domain** (Namecheap, Google Domains, etc.)

**2. Add to Vercel**
- Project Settings → Domains → Add Domain
- Enter your domain: `flightprice.dev`

**3. Configure DNS**
Add these records to your DNS provider:
```
Type: A
Host: @
Value: 76.76.21.21

Type: CNAME
Host: www
Value: cname.vercel-dns.com
```

**4. Wait for propagation** (5-30 minutes)

**5. HTTPS automatically enabled** by Vercel

---

## Backend Deployment Options

### Option A: Railway (Recommended for Beginners)

**Why Railway:**
- ✅ Free tier ($5/month credit)
- ✅ PostgreSQL included
- ✅ Simple interface
- ✅ Automatic HTTPS

**1. Create Railway Account**
- Go to [railway.app](https://railway.app)
- Sign in with GitHub

**2. Create New Project**
- Dashboard → "New Project"
- "Deploy from GitHub repo"
- Select `flight-price-intelligence-lab`

**3. Configure Service**
- Select `backend` directory as root
- Railway auto-detects Python

**4. Add Environment Variables**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
LOG_LEVEL=INFO
LOG_FORMAT=json
PORT=8000
```

**5. Add PostgreSQL**
- Project → "New" → "Database" → "Add PostgreSQL"
- Railway automatically links `DATABASE_URL`

**6. Deploy**
- Push to GitHub → Railway auto-deploys
- Get URL: `https://your-app.railway.app`

**7. Update Vercel Environment**
```
NEXT_PUBLIC_API_URL=https://your-app.railway.app
```

**Cost:** Free ($5/month credit, ~$3-5/month usage)

---

### Option B: Fly.io (Advanced Users)

**Why Fly.io:**
- ✅ Free tier (3 micro VMs)
- ✅ Global edge deployment
- ✅ Docker-based (full control)

**1. Install Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh
```

**2. Login**
```bash
fly auth login
```

**3. Create `fly.toml` in `backend/`**
```toml
app = "flight-price-api"
primary_region = "yyz"  # Toronto (change as needed)

[build]
  [build.args]
    PORT = "8000"

[[services]]
  http_checks = []
  internal_port = 8000
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
    
[env]
  LOG_LEVEL = "INFO"
  LOG_FORMAT = "json"
```

**4. Create `Dockerfile` in `backend/`**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**5. Deploy**
```bash
cd backend
fly deploy
```

**6. Add PostgreSQL**
```bash
fly postgres create
fly postgres attach flight-price-db
```

**7. Get URL**
```
https://flight-price-api.fly.dev
```

**Cost:** Free (3 VMs on free tier)

---

### Option C: Render

**Why Render:**
- ✅ Simple as Railway
- ✅ Free tier
- ✅ Good PostgreSQL support

**1. Create Render Account**
- Go to [render.com](https://render.com)

**2. New Web Service**
- Dashboard → "New +" → "Web Service"
- Connect GitHub repo

**3. Configure**
```
Name: flight-price-api
Root Directory: backend
Environment: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**4. Add PostgreSQL**
- Dashboard → "New +" → "PostgreSQL"
- Free tier (90 days, then paid)

**5. Link Database**
- Copy `Internal Database URL`
- Add to web service env vars as `DATABASE_URL`

**Cost:** Free for 90 days, then $7/month for PostgreSQL

---

## Database Hosting

### Option 1: Neon (Recommended)

**Why Neon:**
- ✅ Free tier (0.5 GB storage)
- ✅ Serverless (auto-pause when idle)
- ✅ PostgreSQL 14+

**Setup:**
```bash
# 1. Go to neon.tech
# 2. Create account
# 3. Create project: "flight-intelligence"
# 4. Copy connection string:
postgres://user:password@ep-xyz.us-east-2.aws.neon.tech/dbname
```

**Cost:** Free (0.5 GB), $19/month (Pro)

---

### Option 2: Supabase

**Why Supabase:**
- ✅ Free tier (500 MB)
- ✅ Built-in auth (future use)
- ✅ REST API auto-generated

**Setup:**
```bash
# 1. Go to supabase.com
# 2. Create project
# 3. Go to Settings → Database
# 4. Copy connection string
```

**Cost:** Free (500 MB), $25/month (Pro)

---

### Option 3: Railway PostgreSQL

**Already included** if using Railway for backend.

---

## Environment Variables

### Frontend (Vercel)
```bash
# Add in Vercel Dashboard → Settings → Environment Variables

NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### Backend (Railway/Fly/Render)
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
LOG_LEVEL=INFO
LOG_FORMAT=json
PORT=8000  # Railway/Render set automatically
```

---

## CI/CD Setup

### GitHub Actions Secrets

**1. Go to GitHub repo → Settings → Secrets and variables → Actions**

**2. Add these secrets:**

#### For Vercel Deployment:
```
VERCEL_TOKEN - Get from vercel.com/account/tokens
VERCEL_ORG_ID - Get from vercel.com/<username>
VERCEL_PROJECT_ID - Get from project settings
```

**How to get Vercel secrets:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
cd /path/to/flight-price-intelligence-lab
vercel link

# Get IDs
cat .vercel/project.json
# Copy orgId and projectId
```

#### For Data Refresh:
```
DATABASE_URL - PostgreSQL connection string
```

#### For Codecov (Optional):
```
CODECOV_TOKEN - Get from codecov.io
```

---

### Verify Workflows Run

**1. Push to main branch**
```bash
git push origin main
```

**2. Check Actions tab**
- Go to GitHub repo → Actions
- You should see 3 workflows:
  - ✅ Tests (running)
  - ✅ Deploy (running)
  - ⏸️ Data Refresh (scheduled, not running yet)

**3. Wait 5-10 minutes**

**4. Verify deployment**
- Tests should pass (green checkmark)
- Deploy should succeed
- Vercel URL should be live

---

## Monitoring & Logging

### Frontend Monitoring (Vercel)

**Built-in:**
- Vercel Analytics (free)
- Web Vitals tracking
- Error reporting

**Enable:**
- Dashboard → Project → Analytics → Enable

### Backend Monitoring

**Option 1: Railway Logs**
```bash
# View logs in Railway dashboard
# Or use CLI:
railway logs
```

**Option 2: Fly.io Logs**
```bash
fly logs
```

**Option 3: External (Recommended for Production)**
- **Sentry:** Error tracking (sentry.io)
- **DataDog:** Full observability (datadoghq.com)
- **Logtail:** Log aggregation (logtail.com)

**Add Sentry (example):**
```bash
pip install sentry-sdk[fastapi]
```

```python
# app/main.py
import sentry_sdk

sentry_sdk.init(
    dsn="https://your-dsn@sentry.io/project",
    traces_sample_rate=0.1,
)
```

---

## Troubleshooting

### Frontend Issues

#### Build Fails on Vercel
**Problem:** `Error: Cannot find module 'recharts'`

**Solution:**
```bash
# Ensure dependencies are in package.json, not devDependencies
cd frontend
npm install recharts --save
git commit -am "fix: Move recharts to dependencies"
git push
```

#### 404 on Routes
**Problem:** Next.js routes return 404

**Solution:** For this repository, do **not** add legacy `routes`/`builds` overrides in a root `vercel.json`.
1. In Vercel Project Settings, set `Root Directory` to `frontend`.
2. Keep framework as `Next.js` so Vercel auto-detects routes from the app build output.
3. Redeploy after removing conflicting `vercel.json` overrides.

---

### Backend Issues

#### Database Connection Fails
**Problem:** `could not connect to server`

**Solution:**
1. Check `DATABASE_URL` environment variable
2. Verify database is running
3. Check firewall/security groups allow connections
4. Test connection locally:
```bash
psql $DATABASE_URL
```

#### CORS Errors
**Problem:** `Access to fetch blocked by CORS policy`

**Solution:** Add Vercel URL to CORS:
```python
# app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://flight-price-intelligence-lab-abc123.vercel.app",
    ],
)
```

---

### CI/CD Issues

#### Tests Fail on GitHub Actions
**Problem:** `ModuleNotFoundError: No module named 'app'`

**Solution:** Check `working-directory` in workflow:
```yaml
# .github/workflows/tests.yml
- name: Run tests
  working-directory: ./backend
  run: pytest tests/ -v
```

#### Deploy Workflow Skipped
**Problem:** Deploy workflow doesn't run

**Solution:** Check secrets are configured:
```bash
# GitHub repo → Settings → Secrets
# Verify VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID exist
```

---

## Production Checklist

Before going live:

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed (Railway/Fly/Render)
- [ ] Database hosted (Neon/Supabase/Railway)
- [ ] Environment variables configured
- [ ] CORS allows production URLs
- [ ] HTTPS enabled (automatic on Vercel/Railway)
- [ ] Tests passing in CI
- [ ] Error monitoring configured (Sentry)
- [ ] Logs aggregation set up
- [ ] Data refresh workflow scheduled
- [ ] Custom domain configured (optional)
- [ ] Backup strategy in place

---

## Cost Summary

### Free Tier (Recommended for MVP)
```
Vercel:         Free (hobby)
Railway:        $0-5/month (free credit)
Neon:           Free (0.5 GB)
GitHub Actions: Free (2000 min/month)
──────────────────────────────
Total:          $0-5/month
```

### Paid Tier (Production Scale)
```
Vercel Pro:         $20/month
Railway Pro:        $20/month
Neon Pro:           $19/month
Sentry:             $26/month
──────────────────────────────
Total:              $85/month
```

**Start with free, scale when needed.**

---

## Next Steps After Deployment

1. **Test live site** - Verify all features work
2. **Share with users** - Get feedback
3. **Monitor errors** - Check Sentry/logs daily
4. **Add to portfolio** - Update resume, LinkedIn
5. **Apply to jobs** - Use live demo in applications

---

**Questions?** Check [CONTRIBUTING.md](CONTRIBUTING.md) or create an issue.

**Last updated:** 2026-03-17
