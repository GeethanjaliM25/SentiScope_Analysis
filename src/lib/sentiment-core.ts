export type Sentiment = "Positive" | "Negative" | "Neutral" | "Irrelevant";

export type SentimentResult = {
  text: string;
  sentiment: Sentiment;
  confidence: number;
  category: string;
  topic: string;
  keywords: string[];
  riskLevel: "low" | "medium" | "high";
  insight: string;
  source: "model" | "fallback";
};

export const SENTIMENTS: Sentiment[] = ["Positive", "Negative", "Neutral", "Irrelevant"];

export const STOP_WORDS = new Set(
  `a an the and or but if while of to in on for with without at by from up down is are was were be been being it its this that these those i you he she they we me my your our their them as so than then too very just not no nor can will would should could have has had do does did about into over after before again more most some such only own same s t don now url http https rt amp`.split(
    /\s+/,
  ),
);

export function cleanText(input: string): string {
  return input
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/@\w+/g, " ")
    .replace(/#/g, " ")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  return cleanText(input)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export function extractKeywords(input: string, limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(input)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

const TOPIC_MAP: Record<string, string[]> = {
  "Product Quality": ["quality", "broken", "defect", "build", "durable", "material", "faulty"],
  "Customer Support": ["support", "service", "agent", "helpdesk", "refund", "response", "ticket"],
  Pricing: ["price", "pricing", "expensive", "cheap", "cost", "billing", "subscription", "fee"],
  Performance: ["slow", "lag", "crash", "bug", "speed", "fast", "downtime", "loading", "glitch"],
  Delivery: ["delivery", "shipping", "late", "arrived", "package", "courier", "order"],
  "Brand Sentiment": ["brand", "love", "hate", "recommend", "worst", "best", "amazing"],
};

const POSITIVE_LEXICON = new Set(
  `love loved great amazing excellent awesome perfect fantastic happy best good nice wonderful brilliant helpful smooth fast reliable recommend satisfied impressed enjoy enjoyed beautiful superb solid worth flawless delightful thanks thank appreciate outstanding`.split(
    /\s+/,
  ),
);

const NEGATIVE_LEXICON = new Set(
  `hate hated terrible awful worst bad poor broken bug bugs crash crashes slow lag laggy useless disappointed disappointing angry frustrating frustrated refund scam waste garbage horrible unacceptable failed failure issue issues problem problems complaint delay delayed rude ignored overpriced expensive annoying`.split(
    /\s+/,
  ),
);

const IRRELEVANT_HINTS = new Set(
  `giveaway retweet follow subscribe promo link bio dm crypto airdrop click winner contest sponsored ad advert`.split(
    /\s+/,
  ),
);

/**
 * Deterministic lexicon fallback used when the FastAPI model endpoint is
 * unreachable, so the product still returns a usable result.
 */
export function fallbackPredict(text: string): { sentiment: Sentiment; confidence: number } {
  const tokens = tokenize(text);
  if (tokens.length === 0) return { sentiment: "Neutral", confidence: 0.5 };

  let pos = 0;
  let neg = 0;
  let irr = 0;
  tokens.forEach((token, index) => {
    const negated = index > 0 && ["not", "never", "no", "dont", "didnt"].includes(tokens[index - 1]);
    if (POSITIVE_LEXICON.has(token)) negated ? neg++ : pos++;
    if (NEGATIVE_LEXICON.has(token)) negated ? pos++ : neg++;
    if (IRRELEVANT_HINTS.has(token)) irr++;
  });

  const total = pos + neg + irr;
  if (irr >= 2 || (irr > 0 && total === irr)) {
    return { sentiment: "Irrelevant", confidence: Math.min(0.95, 0.6 + irr * 0.08) };
  }
  if (total === 0) return { sentiment: "Neutral", confidence: 0.62 };
  if (pos === neg) return { sentiment: "Neutral", confidence: 0.58 };

  const sentiment: Sentiment = pos > neg ? "Positive" : "Negative";
  const margin = Math.abs(pos - neg) / Math.max(total, 1);
  return { sentiment, confidence: Math.min(0.97, 0.62 + margin * 0.33) };
}

export function detectTopic(text: string): string {
  const tokens = new Set(tokenize(text));
  let best = "General Feedback";
  let bestHits = 0;
  for (const [topic, words] of Object.entries(TOPIC_MAP)) {
    const hits = words.filter((word) => tokens.has(word)).length;
    if (hits > bestHits) {
      best = topic;
      bestHits = hits;
    }
  }
  return best;
}

export function categorize(sentiment: Sentiment, topic: string): string {
  if (sentiment === "Negative") return `${topic} — Pain Point`;
  if (sentiment === "Positive") return `${topic} — Advocacy`;
  if (sentiment === "Irrelevant") return "Noise / Spam";
  return `${topic} — Observation`;
}

export function riskFor(sentiment: Sentiment, confidence: number): "low" | "medium" | "high" {
  if (sentiment !== "Negative") return "low";
  return confidence >= 0.8 ? "high" : "medium";
}

export function buildInsight(result: Omit<SentimentResult, "insight">): string {
  const pct = Math.round(result.confidence * 100);
  switch (result.sentiment) {
    case "Negative":
      return `Detected a ${result.riskLevel}-risk complaint about ${result.topic.toLowerCase()} (${pct}% confidence). Route to the support queue and track for recurrence — clustered mentions here often precede churn.`;
    case "Positive":
      return `Positive advocacy signal around ${result.topic.toLowerCase()} (${pct}% confidence). Strong candidate for a testimonial, case study, or amplification on owned channels.`;
    case "Irrelevant":
      return `Classified as noise (${pct}% confidence) — likely promotional or bot content. Exclude from brand-health scoring to avoid skewing trend lines.`;
    default:
      return `Neutral mention of ${result.topic.toLowerCase()} (${pct}% confidence). Informational; monitor for a shift in tone before escalating.`;
  }
}

export function assembleResult(
  text: string,
  prediction: { sentiment: Sentiment; confidence: number },
  source: "model" | "fallback",
): SentimentResult {
  const topic = detectTopic(text);
  const base = {
    text,
    sentiment: prediction.sentiment,
    confidence: Math.max(0, Math.min(1, prediction.confidence)),
    topic,
    category: categorize(prediction.sentiment, topic),
    keywords: extractKeywords(text),
    riskLevel: riskFor(prediction.sentiment, prediction.confidence),
    source,
  };
  return { ...base, insight: buildInsight(base) };
}
