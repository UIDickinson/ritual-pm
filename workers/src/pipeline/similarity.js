const TOKEN_SPLIT_REGEX = /[^a-z0-9]+/g;
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'to', 'and', 'or', 'of', 'in', 'on', 'for', 'with',
  'at', 'as', 'by', 'it', 'this', 'that', 'be', 'from', 'was', 'were', 'will', 'about',
  'before', 'after', 'into', 'over', 'under', 'market', 'ritual', 'prediction'
]);

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(TOKEN_SPLIT_REGEX)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function toTokenSet(value) {
  return new Set(tokenize(value));
}

export function jaccardSimilarity(a, b) {
  const aSet = toTokenSet(a);
  const bSet = toTokenSet(b);

  if (aSet.size === 0 && bSet.size === 0) return 1;
  if (aSet.size === 0 || bSet.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of aSet) {
    if (bSet.has(token)) intersectionCount += 1;
  }

  const unionCount = aSet.size + bSet.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

export function maxSimilarity(text, candidates = []) {
  let max = 0;

  for (const candidate of candidates) {
    const score = jaccardSimilarity(text, candidate);
    if (score > max) max = score;
  }

  return max;
}
