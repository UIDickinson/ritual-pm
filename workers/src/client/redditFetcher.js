/**
 * Reddit RSS fetcher for workers — works without API keys or OAuth.
 *
 * Reddit exposes RSS at /r/{subreddit}/.rss (Atom XML).
 * This module parses the feed and returns structured post objects
 * compatible with the existing pipeline.
 */

/**
 * Parse a Reddit RSS Atom feed into structured post objects.
 * Uses regex parsing to avoid XML library dependencies.
 */
function parseAtomFeed(xml, subreddit) {
  const posts = [];
  const entries = xml.split('<entry>').slice(1);

  for (const entry of entries) {
    try {
      const id = extractTag(entry, 'id') || '';
      const title = decodeHtmlEntities(extractTag(entry, 'title') || '');
      const updated = extractTag(entry, 'updated') || '';
      const contentRaw = extractBetween(entry, '<content type="html">', '</content>') || '';
      const content = decodeHtmlEntities(stripHtml(contentRaw));
      const link = extractAttr(entry, 'link', 'href') || '';
      const authorName = extractTag(entry, 'name') || 'unknown';
      const category = extractAttr(entry, 'category', 'term') || '';

      if (!title) continue;

      const postIdMatch = id.match(/t3_(\w+)/);
      const postId = postIdMatch ? postIdMatch[1] : id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);

      posts.push({
        id: postId,
        title,
        selftext: cleanRedditContent(content).slice(0, 2000),
        author: authorName,
        author_fullname: authorName,
        created_utc: updated ? Math.floor(new Date(updated).getTime() / 1000) : Math.floor(Date.now() / 1000),
        permalink: link.replace('https://www.reddit.com', ''),
        url: link,
        subreddit,
        score: 0,
        ups: 0,
        num_comments: 0,
        over_18: false,
        stickied: false,
        category: category || null,
      });
    } catch {
      // Skip malformed entries
    }
  }

  return posts;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : null;
}

function extractBetween(xml, start, end) {
  const startIdx = xml.indexOf(start);
  if (startIdx === -1) return null;
  const contentStart = startIdx + start.length;
  const endIdx = xml.indexOf(end, contentStart);
  if (endIdx === -1) return null;
  return xml.slice(contentStart, endIdx).trim();
}

function extractAttr(xml, tag, attr) {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*/?>`, 'i'));
  return match ? match[1] : null;
}

function stripHtml(html) {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&apos;/g, "'");
}

function cleanRedditContent(text) {
  if (!text) return '';
  return text
    .replace(/submitted\s+by\s+\/u\/\S+/gi, '')
    .replace(/\[link\]/gi, '')
    .replace(/\[comments\]/gi, '')
    .replace(/\bto\s+\/r\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch hot posts from a subreddit via RSS.
 */
export async function fetchSubredditRSS(subreddit, limit = 25) {
  const url = `https://www.reddit.com/r/${subreddit}/hot/.rss`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ritual-pm/1.0 (prediction market; RSS reader)',
      Accept: 'application/atom+xml, application/xml, text/xml',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const blocked = body.toLowerCase().includes('blocked by network security');
    if (blocked) {
      throw new Error(`Reddit RSS for r/${subreddit} blocked by network security`);
    }
    throw new Error(`Reddit RSS fetch failed for r/${subreddit}: HTTP ${response.status}`);
  }

  const xml = await response.text();

  if (xml.startsWith('<!DOCTYPE') || xml.startsWith('<html')) {
    throw new Error(`Reddit returned HTML instead of RSS for r/${subreddit} — likely blocked`);
  }

  const posts = parseAtomFeed(xml, subreddit);
  return posts.slice(0, limit);
}

/**
 * Fetch posts trying RSS first, then JSON API as fallback.
 */
export async function fetchSubredditPosts(subreddit, limit = 25) {
  // Try RSS first
  try {
    const posts = await fetchSubredditRSS(subreddit, limit);
    if (posts.length > 0) {
      return { posts, method: 'rss' };
    }
  } catch (rssErr) {
    console.warn(`RSS failed for r/${subreddit}: ${rssErr.message}, trying JSON fallback...`);
  }

  // Fallback to JSON API
  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ritual-pm/1.0 (prediction market)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`JSON API HTTP ${response.status}`);
    }

    const payload = await response.json();
    const children = payload?.data?.children || [];
    const posts = children.map(c => c.data).filter(Boolean);
    return { posts, method: 'json' };
  } catch (jsonErr) {
    throw new Error(`All Reddit fetch methods failed for r/${subreddit}: RSS and JSON API both unavailable. Last error: ${jsonErr.message}`);
  }
}
