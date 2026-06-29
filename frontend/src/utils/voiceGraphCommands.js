import { textOverlap } from "./textOverlap";

const MIN_CONFIDENT_SCORE = 0.12;
const AMBIGUOUS_RATIO = 0.8;

const TOP_PRIORITY_PATTERNS = [/top priorit/i, /most important/i, /most urgent/i, /next move/i];
const BLOCKING_PATTERNS = [
  /what'?s?\s+block(?:ing|s)\s+(.+)/i,
  /what\s+is\s+block(?:ing|s)\s+(.+)/i,
];
const FOCUS_PATTERNS = [/(?:show|focus on|open|go to|take me to)\s+(?:me\s+)?(.+)/i];

function matchIssueByPhrase(phrase, issues) {
  const cleaned = (phrase || "").trim();
  if (!cleaned || issues.length === 0) return { type: "no-match" };

  const scored = issues
    .map(node => ({
      node,
      score: Math.max(textOverlap(cleaned, node.text), textOverlap(cleaned, node.category)),
    }))
    .sort((a, b) => b.score - a.score);

  const [best, second] = scored;
  if (!best || best.score < MIN_CONFIDENT_SCORE) return { type: "no-match" };

  if (second && second.score >= best.score * AMBIGUOUS_RATIO && second.score >= MIN_CONFIDENT_SCORE) {
    const candidates = scored.filter(s => s.score >= best.score * AMBIGUOUS_RATIO).map(s => s.node);
    return { type: "ambiguous", candidates };
  }

  return { type: "focus", node: best.node };
}

function resolveBlockingCommand(phrase, issues, edges, effectiveScore) {
  const targetMatch = matchIssueByPhrase(phrase, issues);
  if (targetMatch.type !== "focus") return targetMatch;

  const target = targetMatch.node;
  const blockers = edges
    .filter(e => e.type === "BLOCKS" && e.toNodeId === target.id)
    .map(e => issues.find(n => n.id === e.fromNodeId))
    .filter(Boolean);

  if (blockers.length === 0) return { type: "no-blockers", node: target };
  if (blockers.length === 1) return { type: "focus", node: blockers[0] };

  const topBlocker = [...blockers].sort((a, b) => effectiveScore(b) - effectiveScore(a))[0];
  return { type: "focus", node: topBlocker, multipleBlockers: blockers.length };
}

// Resolves a spoken transcript into one of:
//  { type: "focus", node }                       — confident single match, focus it
//  { type: "ambiguous", candidates }              — multiple issues matched similarly well
//  { type: "no-blockers", node }                  — target issue understood, but nothing blocks it
//  { type: "no-match" }                           — couldn't confidently resolve anything
export function resolveVoiceCommand(transcript, issues, edges, effectiveScore) {
  const text = (transcript || "").trim();
  if (!text || issues.length === 0) return { type: "no-match" };

  if (TOP_PRIORITY_PATTERNS.some(p => p.test(text))) {
    const top = [...issues].sort((a, b) => effectiveScore(b) - effectiveScore(a))[0];
    return { type: "focus", node: top };
  }

  for (const pattern of BLOCKING_PATTERNS) {
    const match = text.match(pattern);
    if (match) return resolveBlockingCommand(match[1], issues, edges, effectiveScore);
  }

  let focusPhrase = text;
  for (const pattern of FOCUS_PATTERNS) {
    const match = text.match(pattern);
    if (match) { focusPhrase = match[1]; break; }
  }

  return matchIssueByPhrase(focusPhrase, issues);
}
