import { submitPolicyEvents, isPipelineEnabled } from '../client/ritualApi.js';
import { fetchSubredditPosts } from '../client/redditFetcher.js';
import { enqueueRawMessages } from '../queue/rawQueue.js';

const REDDIT_BASE = 'https://www.reddit.com';

function buildRawMessageFromPost(subreddit, post) {
  const text = [post.title, post.selftext || ''].join('\n\n').trim();
  if (!text) return null;

  return {
    source: 'reddit',
    sourceMessageId: `post_${post.id}`,
    sourceChatId: `r/${subreddit}`,
    authorId: post.author_fullname || post.author || 'unknown',
    text,
    timestamp: new Date((post.created_utc || Date.now() / 1000) * 1000).toISOString(),
    engagement: {
      likes: Number(post.score || post.ups || 0),
      replies: Number(post.num_comments || 0),
      shares: 0,
      reactions: 0
    },
    metadata: {
      subreddit,
      permalink: post.permalink ? `${REDDIT_BASE}${post.permalink}` : null,
      url: post.url || null,
      over_18: Boolean(post.over_18),
      stickied: Boolean(post.stickied),
      type: 'post'
    }
  };
}

export async function runRedditWorker() {
  // Check if pipeline is enabled before running
  const enabled = await isPipelineEnabled();
  if (!enabled) {
    console.log('Reddit worker: AI pipeline is paused — skipping.');
    return;
  }

  const DEFAULT_SUBREDDITS = 'worldnews,news,politics,technology,science,economics';

  const configuredSubreddits = (process.env.REDDIT_SUBREDDITS || DEFAULT_SUBREDDITS)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const perSubredditLimit = Number(process.env.REDDIT_POST_LIMIT || 25);

  if (configuredSubreddits.length === 0) {
    console.log('Reddit worker: no subreddits configured — skipping.');
    return;
  }

  if (!process.env.REDDIT_SUBREDDITS) {
    console.log(`Reddit worker: REDDIT_SUBREDDITS not set, using defaults: ${DEFAULT_SUBREDDITS}`);
  }

  const rawMessages = [];
  let fetchMethod = 'unknown';

  for (const subreddit of configuredSubreddits) {
    try {
      const { posts, method } = await fetchSubredditPosts(subreddit, perSubredditLimit);
      fetchMethod = method;
      console.log(`Reddit r/${subreddit}: fetched ${posts.length} posts via ${method}`);
      for (const post of posts) {
        const rawMessage = buildRawMessageFromPost(subreddit, post);
        if (rawMessage) rawMessages.push(rawMessage);
      }
    } catch (error) {
      console.error(`Reddit r/${subreddit}: ${error.message}`);
      await submitPolicyEvents([
        {
          source: 'reddit',
          eventType: 'ingestion_error',
          reasonCode: 'subreddit_fetch_failed',
          details: {
            subreddit,
            message: error.message
          }
        }
      ]);
    }
  }

  const enqueueResult = await enqueueRawMessages(rawMessages);

  await submitPolicyEvents([
    {
      source: 'reddit',
      eventType: 'ingestion_run',
      reasonCode: 'ok',
      details: {
        subreddits: configuredSubreddits,
        fetched_messages: rawMessages.length,
        enqueued_messages: enqueueResult.enqueued
      }
    }
  ]);

  console.log(`Reddit ingestion completed: fetched=${rawMessages.length}, enqueued=${enqueueResult.enqueued}`);
}
