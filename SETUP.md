# Ritual PM — v2 Setup Guide

Complete setup instructions for the Next.js prediction-market app **and** the v2 AI-Powered Market Discovery pipeline — locally and on cloud platforms.

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│               Next.js App (Vercel)           │
│   ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│   │  /app/*   │  │ /api/ai/* │  │ /admin/* │ │
│   │  (pages)  │  │ (worker   │  │ proposals│ │
│   │           │  │  endpoints│  │ dashboard│ │
│   └──────────┘  └─────▲─────┘  └──────────┘ │
│                       │ Bearer token          │
└───────────────────────┼──────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          │        AI Workers         │
          │  ┌────────┐ ┌──────────┐  │
          │  │ Reddit │ │ Telegram │  │
          │  │Ingester│ │ Ingester │  │
          │  └───┬────┘ └────┬─────┘  │
          │      └─────┬─────┘        │
          │      ┌─────▼──────┐       │
          │      │   BullMQ   │◀──Redis (Upstash)
          │      │   Queue    │       │
          │      └─────┬──────┘       │
          │      ┌─────▼──────┐       │
          │      │   Topic    │       │
          │      │ Processor  │───Gemini LLM
          │      └────────────┘       │
          │      ┌────────────┐       │
          │      │  Feedback  │       │
          │      │ Aggregator │       │
          │      └────────────┘       │
          └───────────────────────────┘
                        │
          ┌─────────────▼─────────────┐
          │    Supabase (PostgreSQL)   │
          └───────────────────────────┘
```

**Components:**
| Component | What | Hosting |
|---|---|---|
| **Next.js App** | Frontend pages + API routes + admin UI | Vercel / any Node host |
| **AI Workers** | 4 Node.js workers sharing one codebase | GitHub Actions (free) / Render / Docker |
| **Supabase** | PostgreSQL database + auth keys | supabase.com (free tier) |
| **Redis** | BullMQ message queue | Upstash (free tier) / local |
| **Gemini** | LLM for market generation + suitability | Google AI Studio (free tier available) |

---

## 1. Prerequisites

- **Node.js 22+** (LTS) — `node --version`
- **npm 10+** — `npm --version`
- **Git** — `git --version`
- A **Supabase** project ([supabase.com](https://supabase.com))
- An **Upstash Redis** instance ([upstash.com](https://upstash.com)) — or local Redis for dev
- A **Google AI Studio** API key ([aistudio.google.com](https://aistudio.google.com/apikey)) — free tier available
- (Cloud only) A **Telegram bot token** from [@BotFather](https://t.me/BotFather) if using the Telegram ingester

---

## 2. External Service Setup

### 2a. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and note:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public) key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role (secret) key** → `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **SQL Editor** and run the following in order:

```sql
-- 1. Base schema
-- Paste contents of: database/schema.sql

-- 2. AI tables
-- Paste contents of: database/migrations/20260217_001_ai_market_discovery_baseline.sql

-- 3. AI model configs
-- Paste contents of: database/migrations/20260218_002_ai_model_tuning.sql

-- 4. Atomic financial operations
-- Paste contents of: database/migrations/20260218_003_atomic_financial_ops.sql

-- 5. Bonus pool column
-- Paste contents of: database/migrations/20260218_004_bonus_pool_column.sql

-- 6. Composite indexes
-- Paste contents of: database/migrations/20260218_005_composite_indexes.sql

-- 7. AI pipeline control settings
-- Paste contents of: database/migrations/20260219_006_ai_pipeline_control.sql

-- 8. Proposal attribution column
-- Paste contents of: database/migrations/20260219_007_proposals_generated_by.sql

-- 9. Telegram account linking
-- Paste contents of: database/migrations/20260306_008_telegram_user_linking.sql

-- 10. Default platform settings
-- Paste contents of: database/seed.sql
```

> **Tip:** Run each file separately. If a migration fails, check if the objects already exist.

### 2b. Upstash Redis

1. Create a free Redis database at [upstash.com](https://upstash.com)
2. Copy the **REST/Redis URL** (starts with `rediss://...`) → `REDIS_URL`

> For local development, you can use a local Redis instead:
> ```bash
> # Install & start Redis locally (macOS)
> brew install redis && redis-server
>
> # Or via Docker
> docker run -d -p 6379:6379 redis:7-alpine
> ```
> Use `REDIS_URL=redis://localhost:6379` for local dev.

### 2c. Google Gemini API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create a new API key → `GEMINI_API_KEY`
3. The default model is `gemini-2.0-flash` (fast + free tier eligible)

### 2d. Telegram Bot (optional, for Telegram ingestion + account integration)

1. Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot`
2. Copy the bot token → `TELEGRAM_BOT_TOKEN`
3. Add the bot to your desired group/channel
4. Get the chat ID (send a message, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates`)
5. Note the chat ID → `TELEGRAM_ALLOWED_CHAT_IDS`

**Account linking** allows Telegram users to link their Ritual account so they can vote on proposals, check their balance, and submit markets via bot commands. Users run `/link username password` in a DM — the bot deletes the message immediately after processing for security.

**@mention market suggestions:** Admins can reply to a message in the group and tag the bot to generate an AI market suggestion based on the conversation. The bot uses Gemini to analyze the replied message (primary context) plus recent chat history, then DMs the admin a proposal with Submit/Cancel buttons. Requires `GEMINI_API_KEY` in the worker environment.

> Users without an account should register at `https://ritual-market.vercel.app/register` before linking.

### 2e. Generate Shared Secrets

Generate two strong random secrets:

```bash
# JWT secret (min 32 chars)
openssl rand -base64 48
# → use as JWT_SECRET

# AI service bearer token
openssl rand -hex 32
# → use as AI_SERVICE_TOKEN (must be identical in app and workers)
```

---

## 3. Local Development Setup

### 3a. Clone & Install

```bash
git clone https://github.com/UIDickinson/ritual-pm.git
cd ritual-pm

# Install Next.js app dependencies
npm install

# Install worker dependencies
cd workers && npm install && cd ..
```

### 3b. Configure Environment

Create `.env.local` in the project root:

```dotenv
# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── Auth ──
JWT_SECRET=your-jwt-secret-min-32-chars
NODE_ENV=development

# ── AI Pipeline ──
AI_SERVICE_TOKEN=your-shared-bearer-token
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash

# ── Redis (local or Upstash) ──
REDIS_URL=redis://localhost:6379

# ── Workers call back to this URL ──
RITUAL_API_BASE_URL=http://localhost:3000
```

### 3c. Seed the Database

```bash
npm run seed
```

This creates:
- Admin account: `admin` / `admin123` (10,000 points)
- 5 test users: `alice`, `bob`, `charlie`, `diana`, `eve` / `password123` (100 points each)
- Default platform settings

### 3d. Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
Admin panel: [http://localhost:3000/admin](http://localhost:3000/admin)  
AI Proposals: [http://localhost:3000/admin/proposals](http://localhost:3000/admin/proposals)  
AI Dashboard: [http://localhost:3000/admin/ai-dashboard](http://localhost:3000/admin/ai-dashboard)  

### 3e. Run Workers Locally

Open separate terminal windows for each worker:

```bash
# Terminal 1 — Reddit ingestion
cd workers
WORKER_TYPE=reddit \
RITUAL_API_BASE_URL=http://localhost:3000 \
AI_SERVICE_TOKEN=your-shared-bearer-token \
REDIS_URL=redis://localhost:6379 \
REDDIT_SUBREDDITS=predictionmarkets,ritualnet,polymarket \
npm start

# Terminal 2 — Topic processor (includes LLM calls)
cd workers
WORKER_TYPE=topic-processor \
RITUAL_API_BASE_URL=http://localhost:3000 \
AI_SERVICE_TOKEN=your-shared-bearer-token \
REDIS_URL=redis://localhost:6379 \
GEMINI_API_KEY=your-gemini-api-key \
npm start

# Terminal 3 — Feedback aggregator (run once to test)
cd workers
WORKER_TYPE=feedback-aggregator \
RITUAL_API_BASE_URL=http://localhost:3000 \
AI_SERVICE_TOKEN=your-shared-bearer-token \
REDIS_URL=redis://localhost:6379 \
npm start
```

**Local pipeline test flow:**
1. Run the Reddit worker → fetches posts and enqueues to Redis
2. Run the Topic processor → drains queue, scores topics, generates proposals via Gemini
3. Open `/admin/proposals` → review and approve/reject AI-generated proposals
4. Check `/admin/ai-dashboard` → see pipeline metrics

> **Note:** Without `GEMINI_API_KEY`, the topic processor still works using heuristic fallbacks for market generation and suitability filtering. The LLM enhances quality but is not required.

---

## 4. Cloud Deployment

### 4a. Next.js App on Vercel

1. Push the repo to GitHub
2. Import into [vercel.com](https://vercel.com) → **Add New Project**
3. Framework: **Next.js** (auto-detected from `vercel.json`)
4. Set **Environment Variables** in the Vercel dashboard:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `JWT_SECRET` | your strong secret (min 32 chars) |
| `AI_SERVICE_TOKEN` | your shared bearer token |

5. Deploy. Note the production URL (e.g. `https://ritual-market.vercel.app`)

### 4b. Workers — Option A: GitHub Actions (Free)

This is the **zero-cost** option. Workers run as scheduled GitHub Actions jobs.

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Add these **Repository Secrets**:

| Secret | Value | Required |
|---|---|---|
| `RITUAL_API_BASE_URL` | `https://your-app.vercel.app` | ✅ |
| `AI_SERVICE_TOKEN` | same token as set in Vercel | ✅ |
| `REDIS_URL` | Upstash Redis URL | ✅ |
| `GEMINI_API_KEY` | your Gemini API key | ✅ |
| `GEMINI_MODEL` | `gemini-2.0-flash` | optional |
| `REDDIT_SUBREDDITS` | `predictionmarkets,polymarket` | ✅ |
| `REDDIT_POST_LIMIT` | `25` | optional |
| `TELEGRAM_BOT_TOKEN` | your bot token | if using Telegram |
| `TELEGRAM_ALLOWED_CHAT_IDS` | comma-separated chat IDs | if using Telegram |
| `RITUAL_WEBSITE_URL` | `https://ritual-market.vercel.app` | if using Telegram (shown in bot messages) |
| `TELEGRAM_UPDATE_LIMIT` | `100` | optional |
| `TELEGRAM_UPDATE_OFFSET` | `0` | optional |
| `TELEGRAM_CONTINUOUS` | `false` | recommended for scheduled runs |
| `TOPIC_PROCESSOR_DRAIN_LIMIT` | `200` | optional |
| `TOPIC_SCORE_REVIEW_THRESHOLD` | `0.5` | optional |
| `TOPIC_SCORE_HIGH_THRESHOLD` | `0.75` | optional |
| `TOPIC_DUPLICATE_THRESHOLD` | `0.85` | optional |
| `DEFAULT_PROPOSAL_RESOLUTION_DAYS` | `14` | optional |
| `FEEDBACK_LOOKBACK_HOURS` | `72` | optional |
| `MODEL_LEARNING_RATE` | `0.05` | optional |
| `MODEL_TUNING_MIN_SAMPLES` | `5` | optional |

3. The workflow at `.github/workflows/ai-workers.yml` will start running on schedule:
   - **Reddit:** every 20 minutes
   - **Telegram:** every 15 minutes
   - **Topic processor:** every 15 minutes
   - **Feedback aggregator:** daily at 02:00 UTC

4. To test immediately: go to **Actions → AI Workers → Run workflow** → select a worker

> **GitHub Actions free tier** gives 2,000 minutes/month for private repos, 500 MB storage. Each worker run takes ~1-2 minutes, so the schedule fits well within limits.

### 4c. Workers — Option B: Render (Docker)

1. Create a **Render** account at [render.com](https://render.com)
2. Create 4 **Background Worker** or **Cron Job** services using the Docker image:

```bash
# Build context is the repo root
docker build -f workers/Dockerfile -t ritual-pm-workers .
```

3. For each service, set the environment variables:

**Reddit Worker** (Cron: `*/20 * * * *`)
```
WORKER_TYPE=reddit
RITUAL_API_BASE_URL=https://your-app.vercel.app
AI_SERVICE_TOKEN=your-shared-token
REDIS_URL=rediss://your-upstash-url
REDDIT_SUBREDDITS=predictionmarkets,polymarket
```

**Telegram Worker** (Cron: `*/15 * * * *`)
```
WORKER_TYPE=telegram
RITUAL_API_BASE_URL=https://your-app.vercel.app
RITUAL_WEBSITE_URL=https://ritual-market.vercel.app
AI_SERVICE_TOKEN=your-shared-token
REDIS_URL=rediss://your-upstash-url
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ALLOWED_CHAT_IDS=-100123456789
TELEGRAM_CONTINUOUS=false
GEMINI_API_KEY=your-gemini-key
```

**Topic Processor** (Cron: `*/15 * * * *`)
```
WORKER_TYPE=topic-processor
RITUAL_API_BASE_URL=https://your-app.vercel.app
AI_SERVICE_TOKEN=your-shared-token
REDIS_URL=rediss://your-upstash-url
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash
```

**Feedback Aggregator** (Cron: `0 2 * * *`)
```
WORKER_TYPE=feedback-aggregator
RITUAL_API_BASE_URL=https://your-app.vercel.app
AI_SERVICE_TOKEN=your-shared-token
REDIS_URL=rediss://your-upstash-url
GEMINI_API_KEY=your-gemini-key
```

### 4d. Workers — Option C: Any Docker Host (Railway, Fly.io, AWS ECS, etc.)

The same Docker image works anywhere. Key points:
- Build with `docker build -f workers/Dockerfile -t ritual-pm-workers .` from repo root
- Each worker type is a separate container instance with `WORKER_TYPE` set accordingly
- Workers are **run-to-completion jobs** (not long-running servers) — use cron/scheduled tasks
- All workers share the same image, just different env vars

---

## 5. Environment Variable Reference

### Next.js App (.env.local or hosting dashboard)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |
| `JWT_SECRET` | ✅ | JWT signing secret (HS256, min 32 chars) |
| `AI_SERVICE_TOKEN` | ✅ | Shared bearer token for worker → app authentication |
| `NODE_ENV` | — | `development` or `production` (auto-set by host) |

### Workers (per-container env vars)

| Variable | Required | Workers | Default | Description |
|---|---|---|---|---|
| `WORKER_TYPE` | ✅ | all | — | `reddit`, `telegram`, `topic-processor`, or `feedback-aggregator` |
| `RITUAL_API_BASE_URL` | ✅ | all | — | The deployed Next.js app URL |
| `AI_SERVICE_TOKEN` | ✅ | all | — | Must match the app's `AI_SERVICE_TOKEN` |
| `REDIS_URL` | ✅ | all | — | Redis connection string |
| `GEMINI_API_KEY` | recommended | topic-processor, feedback-aggregator, telegram | — | Enables LLM-powered generation (falls back to heuristic without it). Required for Telegram @mention suggestions |
| `GEMINI_MODEL` | — | topic-processor, feedback-aggregator | `gemini-2.0-flash` | Gemini model to use |
| `REDDIT_SUBREDDITS` | ✅ reddit | reddit | — | Comma-separated subreddit names |
| `REDDIT_POST_LIMIT` | — | reddit | `25` | Posts per subreddit per run |
| `TELEGRAM_BOT_TOKEN` | ✅ telegram | telegram | — | Telegram bot token |
| `TELEGRAM_ALLOWED_CHAT_IDS` | — | telegram | — | Optional comma-separated chat ID allowlist |
| `RITUAL_WEBSITE_URL` | — | telegram | *(RITUAL_API_BASE_URL)* | Public-facing site URL shown in bot messages (set to `https://ritual-market.vercel.app`) |
| `TELEGRAM_UPDATE_LIMIT` | — | telegram | `100` | Max updates per poll |
| `TELEGRAM_UPDATE_OFFSET` | — | telegram | — | Offset cursor for dedup |
| `TELEGRAM_CONTINUOUS` | — | telegram | `true` | Set `false` for cron/scheduled runs; `true` for long-running polling |
| `TELEGRAM_POLL_INTERVAL_MS` | — | telegram | `5000` | Poll interval used in continuous mode |
| `TOPIC_PROCESSOR_DRAIN_LIMIT` | — | topic-processor | `200` | Max messages to drain per run |
| `TOPIC_SCORE_REVIEW_THRESHOLD` | — | topic-processor | `0.5` | Min score for "scored" status |
| `TOPIC_SCORE_HIGH_THRESHOLD` | — | topic-processor | `0.75` | Min score for proposal generation |
| `TOPIC_DUPLICATE_THRESHOLD` | — | topic-processor | `0.85` | Jaccard similarity cutoff |
| `DEFAULT_PROPOSAL_RESOLUTION_DAYS` | — | topic-processor | `14` | Fallback resolution window |
| `FEEDBACK_LOOKBACK_HOURS` | — | feedback-aggregator | `72` | Performance data window |
| `MODEL_LEARNING_RATE` | — | feedback-aggregator | `0.05` | Weight update step size |
| `MODEL_TUNING_MIN_SAMPLES` | — | feedback-aggregator | `5` | Min samples to allow tuning |

---

## 6. Database Migrations

When setting up a fresh Supabase project, run files in this order via the SQL Editor:

```
database/schema.sql                                           # base tables
database/migrations/20260217_001_ai_market_discovery_baseline.sql  # AI tables
database/migrations/20260218_002_ai_model_tuning.sql               # model configs
database/migrations/20260218_003_atomic_financial_ops.sql           # financial functions
database/migrations/20260218_004_bonus_pool_column.sql             # bonus pool
database/migrations/20260218_005_composite_indexes.sql             # performance indexes
database/migrations/20260219_006_ai_pipeline_control.sql           # pipeline control defaults
database/migrations/20260219_007_proposals_generated_by.sql        # proposal attribution
database/migrations/20260306_008_telegram_user_linking.sql          # telegram account linking
database/seed.sql                                             # default platform settings
```

Then seed users:
```bash
npm run seed
```

---

## 7. Verifying the Setup

### Checklist

- [ ] App loads at `http://localhost:3000` (or production URL)
- [ ] Can log in as `admin` / `admin123`
- [ ] Admin panel accessible at `/admin`
- [ ] AI Proposals page loads at `/admin/proposals`
- [ ] AI Dashboard loads at `/admin/ai-dashboard`
- [ ] Redis is reachable (topic processor doesn't error on queue connection)
- [ ] Reddit worker runs and enqueues messages (check worker logs)
- [ ] Topic processor drains queue and submits proposals (check `/admin/proposals`)
- [ ] Proposals show `generatedBy: gemini` when `GEMINI_API_KEY` is set

### Quick Smoke Test (Local)

```bash
# 1. Start the app
npm run dev

# 2. In another terminal, run the Reddit ingester
cd workers && \
WORKER_TYPE=reddit \
RITUAL_API_BASE_URL=http://localhost:3000 \
AI_SERVICE_TOKEN=your-token \
REDIS_URL=redis://localhost:6379 \
REDDIT_SUBREDDITS=predictionmarkets \
npm start

# 3. Run the topic processor
cd workers && \
WORKER_TYPE=topic-processor \
RITUAL_API_BASE_URL=http://localhost:3000 \
AI_SERVICE_TOKEN=your-token \
REDIS_URL=redis://localhost:6379 \
GEMINI_API_KEY=your-key \
npm start

# 4. Check the admin UI
# Go to http://localhost:3000/admin/proposals → you should see proposals
# Go to http://localhost:3000/admin/ai-dashboard → pipeline stats
```

### Manual Worker Trigger (GitHub Actions)

1. Go to **Actions → AI Workers → Run workflow**
2. Select `topic-processor` from the dropdown
3. Click **Run workflow**
4. Check the job logs for output

---

## 8. Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `GEMINI_API_KEY is not set` | Missing env var on worker | Add `GEMINI_API_KEY` to worker env. Workers still function without it using heuristic fallbacks. |
| `401 Unauthorized` from `/api/ai/*` | `AI_SERVICE_TOKEN` mismatch | Ensure the exact same token is set in both the app and worker environments |
| `Redis connection refused` | Redis not running / wrong URL | Start local Redis or check Upstash URL. Upstash URLs use `rediss://` (with double s) |
| `No queued raw messages` | Reddit worker hasn't run | Run the reddit worker first to populate the queue |
| `requireAdmin` redirect | Not logged in as admin | Log in as `admin` / `admin123` at `/login` |
| Proposals show `generatedBy: heuristic` | `GEMINI_API_KEY` missing or LLM error | Check worker logs. The pipeline automatically falls back to heuristics if LLM fails |
| `Missing script: build` error | Running `npm run build` from `workers/` | Run from the project root, not the `workers/` directory |
| Database function not found | Migrations not run | Run all migration files in order (see Section 6) |
| Rate limit errors (429) | Middleware rate limiting | Default is 100 req/min per IP. Adjust in `middleware.js` if needed |

---

## 9. Cost Summary

| Service | Free Tier | Notes |
|---|---|---|
| **Vercel** | Hobby plan (free) | Sufficient for the Next.js app |
| **Supabase** | Free tier | 500 MB database, 2 GB bandwidth |
| **Upstash Redis** | Free tier | 10,000 commands/day — plenty for worker queues |
| **Google Gemini** | Free tier | 15 RPM on `gemini-2.0-flash` — sufficient for scheduled workers |
| **GitHub Actions** | 2,000 min/month (private) | ~60 min/day with default schedules |

**Total: $0/month** on free tiers for a typical setup.

---

## 10. Project Structure

```
ritual-pm/
├── app/                    # Next.js App Router
│   ├── admin/              # Admin pages
│   │   ├── page.js         # Main admin dashboard
│   │   ├── proposals/      # AI proposal review page
│   │   ├── ai-dashboard/   # AI pipeline metrics
│   │   ├── settings/       # Platform settings
│   │   ├── disputes/       # Dispute resolution
│   │   └── resolve/        # Market resolution
│   ├── api/                # API routes
│   │   ├── ai/             # Worker-authenticated endpoints
│   │   ├── admin/          # Admin API (proposals, stats, etc.)
│   │   ├── auth/           # Login, register, logout, session
│   │   └── markets/        # Market CRUD + voting
│   ├── create/             # Create market page
│   ├── markets/            # Market detail page
│   ├── predictions/        # User predictions
│   └── login/register/     # Auth pages
├── components/             # Shared React components
├── contexts/               # React context (AuthContext)
├── database/
│   ├── schema.sql          # Base table definitions
│   ├── migrations/         # Numbered migration files
│   └── seed.sql            # Default platform settings
├── lib/
│   ├── auth.js             # JWT session management
│   ├── supabase.js         # Supabase client(s)
│   └── aiServiceAuth.js    # Worker bearer token validation
├── workers/
│   ├── Dockerfile          # Worker container image
│   ├── src/
│   │   ├── index.js        # Entry point (dispatches by WORKER_TYPE)
│   │   ├── workers/        # Worker implementations
│   │   ├── pipeline/       # Scoring, filtering, generation modules
│   │   ├── llm/            # Gemini client wrapper
│   │   ├── queue/          # BullMQ queue operations
│   │   └── client/         # HTTP client for /api/ai/* endpoints
│   └── package.json
├── middleware.js            # Security headers + rate limiting
├── .github/workflows/
│   └── ai-workers.yml      # Scheduled worker runs
├── .env.local              # Local environment variables
└── vercel.json             # Vercel deployment config
```
