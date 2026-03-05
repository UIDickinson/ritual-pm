# Ritual PM Worker Service (v2 Phase 3)

This folder contains the Phase 3 implementation for the v2 AI Market Discovery worker service.

## Purpose

Runs as a **separate managed container service** from the Next.js app and calls worker-authenticated API endpoints:
- `POST /api/ai/messages`
- `POST /api/ai/topics`
- `GET /api/ai/market-context`
- `POST /api/ai/proposals`
- `POST /api/ai/policy-events`
- `GET /api/ai/performance-context`
- `GET/POST /api/ai/model-config`
- `POST /api/ai/feedback`

Implemented workers:
- `reddit` ingestion producer (fetches subreddit hot posts)
- `telegram` ingestion producer (bot `getUpdates`, groups + channels)
- `topic-processor` consumer (drains queue, normalizes, scores topics, filters suitability, generates proposals)
- `feedback-aggregator` worker (collects engagement outcomes and tunes model weights/thresholds)

Queue:
- BullMQ + Redis queue name: `ingestion.raw`

## Environment Variables

Required:
- `WORKER_TYPE=reddit|telegram|topic-processor|feedback-aggregator`
- `RITUAL_API_BASE_URL=https://<your-app-domain>`
- `AI_SERVICE_TOKEN=<shared-secret-must-match-app>`
- `REDIS_URL=redis://...`

Reddit worker:
- `REDDIT_SUBREDDITS=subreddit1,subreddit2`
- `REDDIT_POST_LIMIT=25` (optional)

Telegram worker:
- `TELEGRAM_ALLOWED_CHAT_IDS=-100123..., -100456...`
- `TELEGRAM_BOT_TOKEN=...`
- `TELEGRAM_UPDATE_LIMIT=100` (optional)
- `TELEGRAM_UPDATE_OFFSET=...` (optional, pass back from last run)
- `TELEGRAM_CONTINUOUS=true|false` (optional, default true)

For scheduled/cron execution (for example GitHub Actions), set `TELEGRAM_CONTINUOUS=false` so each run processes one cycle and exits.

Topic processor:
- `TOPIC_PROCESSOR_DRAIN_LIMIT=200` (optional)
- `TOPIC_SCORE_REVIEW_THRESHOLD=0.5` (optional)
- `TOPIC_SCORE_HIGH_THRESHOLD=0.75` (optional)
- `TOPIC_DUPLICATE_THRESHOLD=0.85` (optional)
- `DEFAULT_PROPOSAL_RESOLUTION_DAYS=14` (optional)

Feedback aggregator:
- `FEEDBACK_LOOKBACK_HOURS=72` (optional)
- `MODEL_LEARNING_RATE=0.05` (optional)
- `MODEL_TUNING_MIN_SAMPLES=5` (optional)

## Local Run

```bash
cd workers
npm install
WORKER_TYPE=reddit npm start
WORKER_TYPE=telegram npm start
WORKER_TYPE=topic-processor npm start
WORKER_TYPE=feedback-aggregator npm start
```

## Docker Build/Run

```bash
docker build -f workers/Dockerfile -t ritual-pm-workers .

docker run --rm \
  -e WORKER_TYPE=reddit \
  -e RITUAL_API_BASE_URL=http://host.docker.internal:3000 \
  -e AI_SERVICE_TOKEN=dev-secret \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e REDDIT_SUBREDDITS=ritualnet,predictionmarkets \
  ritual-pm-workers
```

## Managed Service Deployment Notes

Use your managed container platform to create **separate services/jobs**:
1. `ritual-worker-reddit`
2. `ritual-worker-telegram`
3. `ritual-worker-topic-processor`
4. `ritual-worker-feedback-aggregator`

Both can use the same image with different env values.

## Free Deployment Option ($0-first)

If you want to stay on a free setup:
- Use **GitHub Actions scheduled workflows** for worker cron execution.
- Use **Upstash Redis (free tier)** for `REDIS_URL`.
- Keep your Next.js app on your current host (for example Vercel).

Workflow file included:
- `.github/workflows/ai-workers.yml`

Set these GitHub repository secrets before enabling schedules:
- `RITUAL_API_BASE_URL`
- `AI_SERVICE_TOKEN`
- `REDIS_URL`
- `REDDIT_SUBREDDITS`
- `REDDIT_POST_LIMIT` (optional)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_IDS`
- `TELEGRAM_UPDATE_LIMIT` (optional)
- `TELEGRAM_UPDATE_OFFSET` (optional)
- `TOPIC_PROCESSOR_DRAIN_LIMIT` (optional)
- `TOPIC_SCORE_REVIEW_THRESHOLD` (optional)
- `TOPIC_SCORE_HIGH_THRESHOLD` (optional)
- `TOPIC_DUPLICATE_THRESHOLD` (optional)
- `DEFAULT_PROPOSAL_RESOLUTION_DAYS` (optional)
- `FEEDBACK_LOOKBACK_HOURS` (optional)
- `MODEL_LEARNING_RATE` (optional)
- `MODEL_TUNING_MIN_SAMPLES` (optional)

Recommended schedule (managed cron jobs):
- Reddit: every 20 min
- Telegram: every 15 min
- Topic processor: every 15 min
- Feedback aggregator: daily at 02:00 UTC

## Next Steps

Phase 3 currently runs in **closed-loop admin-review mode**:
- Topics are scored with a 6-signal heuristic engagement function.
- Suitability checks enforce resolvability/time-bound/duplicate-policy gating.
- Passing topics are submitted to `market_proposals` as pending items for admin review.
- A nightly feedback worker recalibrates model weights and score thresholds from realized market engagement.

Next build steps:
- add richer NLP clustering and deduplication
- persist Telegram update offsets/cursors via DB-backed source state
- add LLM-backed suitability judge and proposal writer
