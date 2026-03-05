import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { fetchSubredditPosts } from '@/lib/redditFetcher';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/ai-pipeline — returns current pipeline status & last run info
 */
export async function GET() {
  try {
    await requireAdmin();
    const supabase = getServiceSupabase();

    // Get pipeline enabled setting
    const { data: enabledRow } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'ai_pipeline_enabled')
      .single();

    const enabled = enabledRow?.value === true || enabledRow?.value === 'true' || enabledRow?.value === '"true"';

    // Get last run timestamp
    const { data: lastRunRow } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'ai_pipeline_last_run')
      .single();

    const lastRun = lastRunRow?.value
      ? (typeof lastRunRow.value === 'string' ? lastRunRow.value.replace(/"/g, '') : lastRunRow.value)
      : null;

    // Get recent proposal counts for activity indicator
    const { count: recentProposals } = await supabase
      .from('market_proposals')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return NextResponse.json({
      enabled,
      lastRun,
      recentProposals: recentProposals || 0,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('AI pipeline status error:', error);
    return NextResponse.json({ error: 'Failed to get pipeline status' }, { status: 500 });
  }
}

/**
 * POST /api/admin/ai-pipeline — toggle pipeline or trigger a run
 * Body: { action: 'toggle' | 'trigger' }
 */
export async function POST(request) {
  try {
    await requireAdmin();
    const { action } = await request.json();

    if (action === 'toggle') {
      return handleToggle();
    }
    if (action === 'trigger') {
      return handleTrigger();
    }

    return NextResponse.json({ error: 'Invalid action. Use "toggle" or "trigger".' }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('AI pipeline action error:', error);
    return NextResponse.json({ error: 'Pipeline action failed' }, { status: 500 });
  }
}

/**
 * Toggle ai_pipeline_enabled on/off in platform_settings
 */
async function handleToggle() {
  const supabase = getServiceSupabase();

  // Read current value
  const { data: row } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'ai_pipeline_enabled')
    .single();

  const currentlyEnabled = row?.value === true || row?.value === 'true' || row?.value === '"true"';
  const newValue = !currentlyEnabled;

  // Upsert the setting
  const { error } = await supabase
    .from('platform_settings')
    .upsert(
      { key: 'ai_pipeline_enabled', value: JSON.stringify(newValue), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

  if (error) {
    console.error('Toggle pipeline error:', error);
    return NextResponse.json({ error: 'Failed to toggle pipeline' }, { status: 500 });
  }

  return NextResponse.json({ enabled: newValue });
}

/**
 * Generate a well-structured prediction market proposal from a topic.
 */
function buildProposalFromTopic(topic, resolutionDate) {
  const headline = topic.label.trim();
  // Categorize the topic for better market framing
  const categories = [];
  if (/politi|elect|vote|govern|congress|senat|president|parliament/i.test(headline)) categories.push('politics');
  if (/tech|ai|software|cyber|chip|crypto|bitcoin/i.test(headline)) categories.push('technology');
  if (/war|militar|attack|bomb|conflict|troop|invasion|missile/i.test(headline)) categories.push('conflict');
  if (/econom|market|stock|trade|tariff|inflation|gdp|recession/i.test(headline)) categories.push('economics');
  if (/climat|environment|carbon|emission|energy|solar|oil/i.test(headline)) categories.push('environment');
  if (/health|disease|vaccine|covid|pandemic|drug|fda/i.test(headline)) categories.push('health');
  if (/science|space|nasa|discover|research|study/i.test(headline)) categories.push('science');
  if (categories.length === 0) categories.push('world');

  // Build a concise prediction question
  const title = framePredictionQuestion(headline);

  // Description: use the summary if available and different from headline, otherwise craft a brief context line
  let description;
  if (topic.summary && topic.summary !== headline && topic.summary.length > 30) {
    description = topic.summary.slice(0, 300);
  } else {
    description = `Market tracking whether this developing story will materialize or escalate by the resolution date.`;
  }

  // Build specific resolution criteria based on the headline's content
  const resolutionCriteria = buildResolutionCriteria(headline, categories, resolutionDate);

  return {
    topic_id: topic.id,
    source_topic_id: topic.id,
    title,
    description,
    outcomes: ['Yes', 'No'],
    resolution_criteria: resolutionCriteria,
    resolution_date: resolutionDate,
    categories,
    ai_confidence: 0.5,
    engagement_score: topic.engagement_score,
    status: 'pending',
  };
}

/**
 * Clean a news headline into a concise prediction market title.
 * Uses the headline directly (truncated to fit) — no awkward grammar rewrites.
 * The Yes/No outcomes already frame it as a prediction.
 */
function framePredictionQuestion(headline) {
  // Remove leading subreddit references like "/r/worldnews: ..."
  let cleaned = headline.replace(/^\/?r\/\w+:?\s*/i, '').trim();

  // Strip leading labels like "Breaking:", "Update:", "Report:", etc.
  cleaned = cleaned.replace(/^(breaking|update|report|official|confirmed|exclusive|just in):\s*/i, '').trim();

  // Truncate to 120 chars max, breaking at word boundary
  const maxLen = 120;
  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen).replace(/\s+\S*$/, '');
    // Don't end with punctuation fragments
    cleaned = cleaned.replace(/[,;:\-—]+$/, '').trim();
  }

  return cleaned;
}

/**
 * Build specific resolution criteria based on headline content and categories.
 */
function buildResolutionCriteria(headline, categories, resolutionDate) {
  const truncated = headline.slice(0, 120);
  
  if (categories.includes('conflict')) {
    return `Resolves YES if credible reporting confirms military action, escalation, or diplomatic response related to: "${truncated}" by ${resolutionDate}. Resolves NO if no further developments are confirmed.`;
  }
  if (categories.includes('politics')) {
    return `Resolves YES if official statements, votes, or legislative action confirm progress on: "${truncated}" by ${resolutionDate}. Resolves NO otherwise.`;
  }
  if (categories.includes('economics')) {
    return `Resolves YES if economic data, official reports, or market movements confirm: "${truncated}" by ${resolutionDate}. Resolves NO otherwise.`;
  }
  if (categories.includes('technology')) {
    return `Resolves YES if official announcements or technical reports confirm: "${truncated}" by ${resolutionDate}. Resolves NO otherwise.`;
  }
  if (categories.includes('health')) {
    return `Resolves YES if health authorities or peer-reviewed sources confirm: "${truncated}" by ${resolutionDate}. Resolves NO otherwise.`;
  }
  if (categories.includes('science')) {
    return `Resolves YES if scientific publications or official agencies confirm: "${truncated}" by ${resolutionDate}. Resolves NO otherwise.`;
  }
  // Generic fallback
  return `Resolves YES if major news outlets confirm the development described: "${truncated}" by ${resolutionDate}. Resolves NO if unconfirmed or retracted.`;
}

/**
 * Trigger a one-shot pipeline run: fetch Reddit → build topics → generate proposals
 * Runs inline (no worker infrastructure required)
 */
async function handleTrigger() {
  const supabase = getServiceSupabase();
  const results = { fetched: 0, topics: 0, proposals: 0, errors: [] };

  try {
    // 1. Fetch Reddit hot posts (RSS with JSON fallback)
    const subreddits = (process.env.REDDIT_SUBREDDITS || 'worldnews,news,politics,technology,science,economics').split(',').map(s => s.trim()).filter(Boolean);
    const allPosts = [];
    let fetchMethod = 'unknown';

    for (const sub of subreddits.slice(0, 4)) {
      try {
        const { posts, method } = await fetchSubredditPosts(sub, 5);
        fetchMethod = method;
        // Filter out stickied, empty, and non-newsworthy posts
        const filtered = posts.filter(p => {
          if (!p || !p.title || p.stickied) return false;
          // Skip meta/discussion/live threads
          if (/^\/?r\/|live thread|discussion thread|megathread/i.test(p.title)) return false;
          // Skip very short titles (often memes/jokes)
          if (p.title.length < 20) return false;
          return true;
        });
        allPosts.push(...filtered);
      } catch (err) {
        results.errors.push(`Reddit r/${sub}: ${err.message}`);
      }
    }

    results.fetched = allPosts.length;
    results.fetchMethod = fetchMethod;
    if (allPosts.length === 0) {
      return NextResponse.json({
        ...results,
        message: 'No posts fetched from Reddit',
        diagnostics: {
          checkedSubreddits: subreddits.slice(0, 3),
          likelyCause: results.errors.some(e => e.includes('blocked'))
            ? 'reddit_network_block'
            : 'unknown_or_empty_feed',
          hint: 'Reddit may be blocking this server IP. Try deploying to a different environment or check error details.',
        },
      });
    }

    // 2. Deduplicate and build topics
    const seen = new Set();
    const topics = [];
    for (const post of allPosts) {
      const label = post.title.slice(0, 200);
      const key = label.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);

      const nowIso = new Date().toISOString();
      // Clean up the summary — use selftext if meaningful, otherwise use title
      const rawSummary = (post.selftext || '').trim();
      const summary = rawSummary.length > 20 ? rawSummary.slice(0, 500) : label;

      topics.push({
        label,
        summary,
        source_breakdown: { reddit: 1, subreddit: post.subreddit || 'unknown' },
        first_seen: nowIso,
        last_seen: nowIso,
        message_count: 1,
        // RSS doesn't carry scores; assign baseline confidence by position in feed
        engagement_score: 0.5,
        status: 'detected',
      });
    }

    // Keep top topics — limited set for quality over quantity
    topics.sort((a, b) => b.engagement_score - a.engagement_score);
    const topTopics = topics.slice(0, 5);

    // 3. Insert topics
    const { data: insertedTopics, error: topicErr } = await supabase
      .from('ai_topics')
      .insert(topTopics)
      .select('id, label, summary, engagement_score');

    if (topicErr) {
      results.errors.push(`Topic insert: ${topicErr.message}`);
      return NextResponse.json({ ...results, message: 'Failed to insert topics' }, { status: 500 });
    }

    results.topics = insertedTopics.length;

    // 4. Generate proposals from all topics (already limited to 5)
    const proposalPayloads = [];
    for (const topic of insertedTopics) {
      try {
        const resolutionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const proposal = buildProposalFromTopic(topic, resolutionDate);
        proposalPayloads.push(proposal);
      } catch (err) {
        results.errors.push(`Proposal gen for "${topic.label.slice(0, 30)}": ${err.message}`);
      }
    }

    if (proposalPayloads.length > 0) {
      const { data: insertedProposals, error: propErr } = await supabase
        .from('market_proposals')
        .insert(proposalPayloads)
        .select('id');

      if (propErr) {
        results.errors.push(`Proposal insert: ${propErr.message}`);
      } else {
        results.proposals = insertedProposals.length;

        // Mark topics as proposed
        const topicIds = proposalPayloads.map(p => p.topic_id);
        await supabase.from('ai_topics').update({ status: 'proposed' }).in('id', topicIds);
      }
    }

    // 5. Record last run timestamp
    await supabase
      .from('platform_settings')
      .upsert(
        { key: 'ai_pipeline_last_run', value: JSON.stringify(new Date().toISOString()), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    return NextResponse.json({
      ...results,
      message: `Pipeline run complete: ${results.topics} topics, ${results.proposals} proposals created`,
    });
  } catch (error) {
    console.error('Pipeline trigger error:', error);
    results.errors.push(error.message);
    return NextResponse.json({ ...results, message: 'Pipeline run failed' }, { status: 500 });
  }
}
