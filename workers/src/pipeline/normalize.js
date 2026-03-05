import crypto from 'crypto';

export function normalizeMessage(rawMessage) {
  const timestamp = rawMessage.timestamp || new Date().toISOString();
  const authorRaw = String(rawMessage.authorId || rawMessage.author || 'unknown');
  const authorHash = crypto.createHash('sha256').update(authorRaw).digest('hex');

  return {
    source: rawMessage.source,
    sourceMessageId: String(rawMessage.sourceMessageId),
    sourceChatId: rawMessage.sourceChatId ? String(rawMessage.sourceChatId) : null,
    authorHash,
    text: String(rawMessage.text || '').slice(0, 8000),
    timestamp,
    engagement: rawMessage.engagement || {},
    metadata: rawMessage.metadata || {}
  };
}
