function signature(text) {
  return new Set((text || "").toLowerCase().split(/\W+/).filter(w => w.length > 3));
}

// Word-set overlap (intersection / union of words >3 chars) — a cheap fuzzy text similarity
// score in [0, 1]. Used both to detect duplicate issues across merged sessions and to resolve
// spoken phrases against issue text/category for voice-driven graph navigation.
export function textOverlap(a, b) {
  const aW = signature(a), bW = signature(b);
  const common = [...aW].filter(w => bW.has(w)).length;
  return common / Math.max(aW.size, bW.size, 1);
}
