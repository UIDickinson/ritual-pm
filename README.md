# Ritual Prediction Market

A decentralized prediction market platform for the Ritual Network community, built with Next.js and Supabase.

## Features

### Core Functionality
- **User Authentication**: Secure username/password authentication system
- **Market Creation**: Create prediction markets with 2-5 possible outcomes
- **Community Approval**: Markets require community votes before going live
- **Prediction Trading**: Place predictions on market outcomes with a 1% platform fee
- **Market Resolution**: Admin-managed resolution with automatic payout distribution
- **Dispute System**: 24-hour window to dispute resolutions with admin review

### User Features
- Dashboard with live, proposed, and closed markets
- Search and filter markets by keywords
- Personal prediction history with performance stats
- Real-time balance tracking
- Market detail pages with outcome percentages

### Admin Features
- Comprehensive admin dashboard with statistics
- Market status management (activate, close, dissolve)
- User management (balance adjustment, role changes)
- Dispute resolution (uphold, overturn, invalidate)
- Platform settings configuration
- Activity logs and analytics
- AI proposal review workflow (approve, edit+approve, reject)
- AI pipeline controls (enable/disable and manual trigger)

### AI + Telegram Features
- AI ingestion and market proposal pipeline for Reddit/Telegram sources
- Dedicated worker service (`workers/`) with queue-based topic processing
- Telegram bot with full account integration: link your Ritual account, vote on proposals, check balance, and submit markets — all from Telegram
- **@mention market suggestions**: tag the bot in a group (replying to a message) and it uses Gemini to generate a market proposal based on the conversation context. Admins confirm/cancel via DM
- Telegram command state persisted via platform settings (listen chat IDs + update offset)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4 with custom emerald-green theme
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom bcrypt-based system
- **Queue**: BullMQ + Redis
- **LLM**: Google Gemini (with heuristic fallback)
- **Icons**: Lucide React

## Installation

1. Clone the repository:
```bash
git clone https://github.com/UIDickinson/ritual-pm.git
cd ritual-pm
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
AI_SERVICE_TOKEN=shared_secret_for_worker_api_auth
GEMINI_API_KEY=optional_for_llm_generation
GEMINI_MODEL=gemini-2.0-flash
```

4. Set up the database:
- Run the SQL schema from `database/schema.sql` in your Supabase project
- This creates all necessary tables, functions, and triggers
- Run SQL migrations in `database/migrations/` (includes v2 AI Market Discovery tables)

5. Seed the database (optional):
```bash
node scripts/seed.js
```
This creates:
- Admin user (username: `admin`, password: `admin123`)
- 5 test users (alice, bob, charlie, diana, eve - password: `password123`)

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Usage

### For Users

1. **Register/Login**: Create an account or login with existing credentials
2. **Browse Markets**: View live, proposed, and closed markets on the dashboard
3. **Vote on Proposals**: Approve or reject proposed markets (requires 10 votes)
4. **Place Predictions**: Stake points on outcomes you believe will happen
5. **Track Performance**: View your prediction history and statistics
6. **Dispute Resolutions**: Challenge incorrect resolutions within 24 hours

### For Admins

1. **Access Admin Dashboard**: Click "Admin" in the navigation (admin only)
2. **Manage Markets**:
   - Activate approved markets to make them live
   - Close live markets when time expires
   - Dissolve inappropriate proposed markets
3. **Resolve Markets**:
   - Select winning outcomes
   - Automatic payout distribution
4. **Handle Disputes**:
   - Review dispute reasoning
   - Uphold, overturn, or invalidate resolutions
5. **Manage Users**:
   - Adjust user balances
   - Change user roles (admin/member/viewer)
6. **Configure Platform**:
   - Set approval vote requirements
   - Adjust time windows
   - Modify platform fee percentage

## Security

- Passwords hashed with bcrypt (10 rounds)
- Admin-only routes protected with role validation
- SQL injection prevention via Supabase parameterized queries
- Activity logging for audit trails

## AI Market Discovery v2 (Phase 3)

The repository now includes a v2 Phase 3 pipeline for AI-assisted market discovery:

- SQL migration baseline for AI topics/proposals/events in `database/migrations/`
- Worker-authenticated app routes under `/api/ai/*` (including `/api/ai/messages`, `/api/ai/market-context`, `/api/ai/proposals`, `/api/ai/performance-context`, `/api/ai/model-config`, `/api/ai/telegram`)
- Admin proposal routes under `/api/admin/proposals` and `/api/admin/ai-dashboard`
- Admin pipeline control route under `/api/admin/ai-pipeline`
- Separate worker service in `workers/` for managed container deployment (Reddit, Telegram, topic-processor, feedback-aggregator)

Phase 3 adds a feedback aggregation + auto-tuning loop that updates active engagement model weights and thresholds from realized market outcomes.

### Worker Service Quick Start

1. Install worker dependencies:
```bash
cd workers
npm install
```

2. Configure env vars for workers:
```
RITUAL_API_BASE_URL=https://your-app-domain
AI_SERVICE_TOKEN=shared_secret_for_worker_api_auth
REDIS_URL=redis://your-redis-host:6379
```

3. Run a worker locally:
```bash
WORKER_TYPE=reddit REDDIT_SUBREDDITS=ritualnet,predictionmarkets npm start
WORKER_TYPE=telegram TELEGRAM_BOT_TOKEN=... TELEGRAM_ALLOWED_CHAT_IDS=-10012345,-10067890 npm start
WORKER_TYPE=topic-processor npm start
WORKER_TYPE=feedback-aggregator npm start
```

Telegram worker runtime options:
- `TELEGRAM_CONTINUOUS=true` (default): long-running bot polling loop (best for local/manual hosting)
- `TELEGRAM_CONTINUOUS=false`: one-shot polling cycle (best for cron/GitHub Actions)
- `TELEGRAM_POLL_INTERVAL_MS=5000` (default): loop interval for continuous mode
- `RITUAL_WEBSITE_URL`: public-facing site URL shown in bot messages (defaults to `RITUAL_API_BASE_URL`)

### Telegram Bot Commands

**Account commands (DM the bot)**

| Command | Description |
|---|---|
| `/start` | Welcome message with keyboard shortcuts |
| `/link username password` | Link your Ritual account. Credential message is immediately deleted for security |
| `/balance` | View your points balance, prediction stats, and win/loss record |
| `/create question \| description \| YYYY-MM-DD` | Submit a market proposal (DM only, linked account required). Add a 4th field for custom outcomes: `\| opt1, opt2, opt3` (2-5 options) |

**Market commands (groups or DM)**

| Command | Description |
|---|---|
| `/vote` | Show proposed markets with inline Approve/Reject buttons. Auto-deletes after 1 min |
| `/list` | Choose Proposed or Live markets — inline buttons disappear after selection |

**Group/channel management**

| Command | Description |
|---|---|
| `/listen` | Enable message ingestion for this group/channel |
| `/stop` | Disable ingestion for this group/channel |
| `/peek` | Analyze recent messages and generate proposal candidates |
| `/help` | Show command reference |

**@mention (groups only)**

| Action | Description |
|---|---|
| Reply to a message and tag `@YourBot` | Bot reads the replied message + recent chat context, uses Gemini to suggest a market, and DMs the admin a proposal with Submit/Cancel buttons |

> **Tip:** Reply to the most relevant message when tagging the bot — the replied message is treated as primary context for generating the suggestion.

### Telegram Setup Checklist

1. Create bot in Telegram via `@BotFather` and copy `TELEGRAM_BOT_TOKEN`.
2. Add the bot to your target group/channel.
3. Ensure worker env has:
   - `WORKER_TYPE=telegram`
   - `RITUAL_API_BASE_URL` pointing to your app (used for API calls)
   - `RITUAL_WEBSITE_URL` pointing to your public site (shown in bot messages, e.g. `https://ritual-market.vercel.app`)
   - `AI_SERVICE_TOKEN` matching app value exactly
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_ALLOWED_CHAT_IDS` (optional allowlist)
   - `GEMINI_API_KEY` (required for @mention market suggestions)
4. Run migration `database/migrations/20260306_008_telegram_user_linking.sql` in Supabase.
5. **Important:** Message the bot privately at least once (e.g. `/start`) so it can DM you @mention suggestions.
6. Start the app (`npm run dev`) and worker (`cd workers && npm start`).
7. In Telegram, run `/listen` in the group/channel to enable ingestion.
8. DM the bot `/link username password` to connect your Ritual account.
9. Use `/vote` to approve/reject proposals, `/balance` to check your account, `/create` to submit markets.
10. To suggest a market from chat context, reply to a message and tag the bot.

See `workers/README.md` for Docker and managed-service deployment notes.

Recommended managed cron schedule:
- Reddit: every 20 minutes
- Telegram: every 15 minutes
- Topic processor: every 15 minutes
- Feedback aggregator: daily at 02:00 UTC

Free deployment option:
- Use `.github/workflows/ai-workers.yml` for scheduled worker execution on GitHub Actions.
- Use Upstash Redis free tier for `REDIS_URL`.
- Add required repository secrets listed in `workers/README.md`.

## Deploy (Vercel + GitHub Actions Workers)

This project is deployed as two parts:

1. **Next.js app** on Vercel
2. **AI workers** on GitHub Actions schedule (or any worker host)

### 1. Deploy the app to Vercel

1. Push your repository to GitHub.
2. In Vercel, import the repo and create a project.
3. In Vercel Project Settings -> Environment Variables, set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...

AI_SERVICE_TOKEN=...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash

REDIS_URL=rediss://...
RITUAL_API_BASE_URL=https://<your-vercel-domain>
```

4. Deploy and copy your production URL (for example `https://your-app.vercel.app`).

### 2. Prepare Supabase schema

Run these SQL files in your Supabase project:

1. `database/schema.sql`
2. `database/migrations/20260217_001_ai_market_discovery_baseline.sql`
3. `database/migrations/20260218_002_ai_model_tuning.sql`
4. `database/migrations/20260218_003_atomic_financial_ops.sql`
5. `database/migrations/20260218_004_bonus_pool_column.sql`
6. `database/migrations/20260218_005_composite_indexes.sql`
7. `database/migrations/20260219_006_ai_pipeline_control.sql`
8. `database/migrations/20260219_007_proposals_generated_by.sql`
9. `database/migrations/20260306_008_telegram_user_linking.sql`
10. `database/seed.sql` (optional)

### 3. Configure GitHub Actions workers

In GitHub -> Settings -> Secrets and variables -> Actions, add:

- `RITUAL_API_BASE_URL` = your Vercel URL
- `AI_SERVICE_TOKEN` = same value as Vercel `AI_SERVICE_TOKEN`
- `REDIS_URL`
- `REDDIT_SUBREDDITS` (optional)
- `REDDIT_POST_LIMIT` (optional)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_IDS`
- `TELEGRAM_UPDATE_LIMIT` (optional)
- `TELEGRAM_UPDATE_OFFSET` (optional)
- `TELEGRAM_CONTINUOUS` (set to `false` for scheduled runs)
- `TELEGRAM_POLL_INTERVAL_MS` (optional)
- `RITUAL_WEBSITE_URL` (public site URL shown in bot messages)
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional)
- `TOPIC_PROCESSOR_DRAIN_LIMIT` (optional)
- `TOPIC_SCORE_REVIEW_THRESHOLD` (optional)
- `TOPIC_SCORE_HIGH_THRESHOLD` (optional)
- `TOPIC_DUPLICATE_THRESHOLD` (optional)
- `DEFAULT_PROPOSAL_RESOLUTION_DAYS` (optional)
- `FEEDBACK_LOOKBACK_HOURS` (optional)
- `MODEL_LEARNING_RATE` (optional)
- `MODEL_TUNING_MIN_SAMPLES` (optional)

Then run `.github/workflows/ai-workers.yml` once with **workflow_dispatch** to validate setup.

### 4. Important Telegram note

For scheduled worker runs, keep `TELEGRAM_CONTINUOUS=false` so each cron run executes one polling cycle and exits cleanly.

## Troubleshooting

### Telegram bot does not respond
- Confirm worker is running with `WORKER_TYPE=telegram`.
- Verify `TELEGRAM_BOT_TOKEN` is valid (`getMe` call succeeds).
- If previously configured for webhooks, clear it for polling mode:
   - `https://api.telegram.org/bot<TOKEN>/deleteWebhook`

### Worker fails with `ECONNREFUSED` or API fetch errors
- App server is unreachable from worker.
- For local dev set `RITUAL_API_BASE_URL=http://localhost:3000` and ensure `npm run dev` is running.

### Unauthorized AI requests (`401`)
- `AI_SERVICE_TOKEN` must match exactly between app `.env.local` and worker env.

### `/listen` works but no messages are ingested
- Check `TELEGRAM_ALLOWED_CHAT_IDS` includes that chat ID (or leave empty to disable allowlist).
- Use `/stop` then `/listen` again to refresh listen state.

### `/create` fails or says account not linked
- `/create` requires a linked Ritual account. DM the bot `/link username password` first.
- `/create` only works in DMs, not groups.
- Validate close date is in the future.

### `/peek` returns 0 proposals
- Not enough recent meaningful messages in the past hour.
- Topic suitability/duplicate filters may reject candidates.
- Try with more specific, event-driven messages and rerun `/peek`.

### @mention suggestion not working
- The bot must have `/listen` enabled in the group.
- `GEMINI_API_KEY` must be set in the worker environment.
- Only admins can trigger @mention suggestions.
- Reply to a specific message for best results — the replied message is treated as primary context.
- If the bot can't DM you, message it privately first (e.g. `/start`) to open the DM channel.

## Market Lifecycle

1. **Proposed** → Community voting (15 hours, 10 votes required)
2. **Approved** → Awaiting admin activation
3. **Live** → Active trading until close time
4. **Closed** → Trading ended, awaiting resolution
5. **Resolved** → Winner selected, 24-hour dispute window
6. **Disputed** → Under admin review (if disputed)
7. **Final** → Completed, payouts distributed

## Contributing

This is a community project for Ritual Network. Contributions are highly welcome!


## Links

- [Ritual Network](https://ritual.net)


---

Built with ❤️ for the Ritual Network community