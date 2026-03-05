import crypto from 'crypto';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'to', 'and', 'or', 'of', 'in', 'on', 'for', 'with',
  'at', 'as', 'by', 'it', 'this', 'that', 'be', 'from', 'was', 'were', 'will', 'about'
]);

function keywordFromText(text) {
  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));

  return words[0] || 'general';
}

function hashToUuid(input) {
  const hash = crypto.createHash('sha256').update(input).digest('hex').slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export function buildTopicCandidates(messages) {
  const grouped = new Map();

  for (const message of messages) {
    if (!message.text) continue;

    const keyword = keywordFromText(message.text);
    const groupKey = `${message.source}:${message.sourceChatId || 'global'}:${keyword}`;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }

    grouped.get(groupKey).push(message);
  }

  const topics = [];

  for (const [groupKey, groupMessages] of grouped.entries()) {
    const [source, sourceChatId, keyword] = groupKey.split(':');
    const firstSeen = groupMessages
      .map((message) => new Date(message.timestamp).getTime())
      .reduce((min, current) => Math.min(min, current), Date.now());

    const lastSeen = groupMessages
      .map((message) => new Date(message.timestamp).getTime())
      .reduce((max, current) => Math.max(max, current), 0);

    const sampleTexts = groupMessages.slice(0, 3).map((message) => message.text.trim()).filter(Boolean);

    topics.push({
      id: hashToUuid(groupKey),
      label: `${source.toUpperCase()} trend: ${keyword}`,
      summary: sampleTexts.join(' ').slice(0, 600) || `Emerging ${source} discussion around ${keyword}.`,
      entities: [keyword],
      firstSeen: new Date(firstSeen).toISOString(),
      lastSeen: new Date(lastSeen || Date.now()).toISOString(),
      sourceBreakdown: { [source]: groupMessages.length },
      messageCount: groupMessages.length,
      engagementScore: Math.min(0.95, 0.4 + groupMessages.length * 0.03),
      status: 'detected',
      metadata: {
        sourceChatId: sourceChatId === 'global' ? null : sourceChatId,
        representativeMessages: sampleTexts
      }
    });
  }

  return topics;
}
