# Deployment Guide: AIDA Monorepo

This guide provides step-by-step instructions for deploying the **AIDA Monorepo**:
- **Frontend (`apps/web`)**: Next.js 16 App Router hosted on **Vercel**.
- **Backend (`apps/api`)**: NestJS API with Prisma, BullMQ, and Redis hosted on **Render**.
- **Shared Package (`packages/shared`)**: Automatically compiled and bundled during app builds.

---

## 1. Backend Deployment (`apps/api` on Render)

We have created a `render.yaml` Blueprint file in the repository root for automated set up on Render.

### Option A: Automatic Setup using Render Blueprint (Recommended)
1. Log in to [Render Dashboard](https://dashboard.render.com) and click **New + -> Blueprint**.
2. Connect your GitHub repository containing the AIDA monorepo.
3. Render will automatically detect `render.yaml` and configure the `aida-api` service.
4. Fill in your environment variables:
   - `DATABASE_URL` (Your PostgreSQL database connection string)
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (Your Upstash / Redis credentials)
   - `WEB_ORIGIN` (Your Vercel frontend URL, e.g., `https://your-app.vercel.app`)
5. Click **Apply**. Render will automatically build `@aida/shared` and `apps/api` and start the server.

### Option B: Manual Web Service Setup on Render
If setting up manually without Blueprint:
1. Go to Render Dashboard and click **New + -> Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name**: `aida-api`
   - **Environment**: `Node`
   - **Root Directory**: `.` (leave as root)
   - **Build Command**: `npm install && npm run build:api`
   - **Start Command**: `npm run start:api`
4. Under **Environment Variables**, add:
   - `PORT`: `10000` (or `6001`)
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `<your_postgres_url>`
   - `REDIS_HOST`: `<your_redis_host>`
   - `REDIS_PORT`: `6379`
   - `REDIS_PASSWORD`: `<your_redis_password>`
   - `JWT_SECRET`: `<your_jwt_secret>`
   - `WEB_ORIGIN`: `https://your-app.vercel.app`

---

## 2. Frontend Deployment (`apps/web` on Vercel)

### Step 1: Import Project on Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... -> Project**.
2. Select your repository containing the AIDA monorepo.
3. In the project configuration screen:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select `apps/web`.
   - **Build Command**: `cd ../.. && npm run build:web` (or `npm run build:web` if root is `.`).
   - **Install Command**: `cd ../.. && npm install` (or `npm install`).

### Step 2: Set Environment Variables on Vercel
Under **Settings -> Environment Variables**, add:

| Key | Description | Example Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Render Backend API URL | `https://aida-api.onrender.com` |

### Step 3: Deploy
Click **Deploy**. Vercel will build `@aida/shared` first, then build `apps/web` and deploy it globally.

---

## 3. Environment Variables Reference (`apps/api`)

```env
# Application
PORT=10000
NODE_ENV=production
WEB_ORIGIN=https://your-vercel-app.vercel.app

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@your-db-host:5432/aida_db?schema=public"

# Redis & Queues (Upstash / Managed Redis)
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# AWS S3 (Storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET_NAME=your_bucket_name

# Sentry (Optional Error Tracking)
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project
```

---

## 4. Local Build Verification

```bash
# Build shared package
npm run build:shared

# Build frontend web
npm run build:web

# Build backend API
npm run build:api

# Build all monorepo workspaces
npm run build
```
