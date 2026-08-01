import { STOP_WORDS, cleanText, type Sentiment } from "./sentiment-core";

export type CorpusRow = {
  id: string;
  dataset_id: string | null;
  text: string;
  sentiment: string;
  confidence: number;
  category: string | null;
  topic: string | null;
  keywords: string[];
  risk_level: string;
  source: string;
  created_at: string;
};

export const SENTIMENT_ORDER: Sentiment[] = ["Positive", "Negative", "Neutral", "Irrelevant"];

export const SENTIMENT_COLOR: Record<string, string> = {
  Positive: "var(--positive)",
  Negative: "var(--negative)",
  Neutral: "var(--neutral)",
  Irrelevant: "var(--irrelevant)",
};

export function countSentiments(rows: { sentiment: string }[]) {
  const counts: Record<string, number> = { Positive: 0, Negative: 0, Neutral: 0, Irrelevant: 0 };
  for (const row of rows) counts[row.sentiment] = (counts[row.sentiment] ?? 0) + 1;
  return counts;
}

export function keywordFrequency(rows: { text: string; keywords?: string[] }[], limit = 40) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const words = row.keywords?.length
      ? row.keywords
      : cleanText(row.text)
          .split(" ")
          .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count], index) => ({ word, count, rank: index + 1 }));
}

export type TopicBucket = {
  topic: string;
  Positive: number;
  Negative: number;
  Neutral: number;
  Irrelevant: number;
  total: number;
};

export function topicFrequency(rows: CorpusRow[]): TopicBucket[] {
  const counts = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const topic = row.topic ?? "General";
    const bucket = counts.get(topic) ?? { Positive: 0, Negative: 0, Neutral: 0, Irrelevant: 0, total: 0 };
    bucket[row.sentiment] = (bucket[row.sentiment] ?? 0) + 1;
    bucket.total += 1;
    counts.set(topic, bucket);
  }
  return [...counts.entries()]
    .map(([topic, values]) => ({
      topic,
      Positive: values.Positive ?? 0,
      Negative: values.Negative ?? 0,
      Neutral: values.Neutral ?? 0,
      Irrelevant: values.Irrelevant ?? 0,
      total: values.total ?? 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function trendSeries(rows: CorpusRow[], days = 21) {
  const map = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    const bucket = map.get(date) ?? { Positive: 0, Negative: 0, Neutral: 0, Irrelevant: 0, total: 0 };
    bucket[row.sentiment] = (bucket[row.sentiment] ?? 0) + 1;
    bucket.total += 1;
    map.set(date, bucket);
  }
  return [...map.entries()]
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days);
}

export function satisfactionScore(counts: Record<string, number>) {
  const relevant = counts.Positive + counts.Negative + counts.Neutral;
  if (!relevant) return 0;
  return Math.round(((counts.Positive + counts.Neutral * 0.5) / relevant) * 100);
}

export type Insight = {
  title: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
  actions: string[];
};

export function buildBusinessInsights(rows: CorpusRow[]): Insight[] {
  const counts = countSentiments(rows);
  const total = rows.length;
  if (!total) return [];
  const csat = satisfactionScore(counts);
  const topics = topicFrequency(rows);
  const negativeTopic = [...topics].sort((a, b) => (b.Negative ?? 0) - (a.Negative ?? 0))[0];
  const positiveTopic = [...topics].sort((a, b) => (b.Positive ?? 0) - (a.Positive ?? 0))[0];
  const highRisk = rows.filter((r) => r.risk_level === "high").length;
  const noise = Math.round((counts.Irrelevant / total) * 100);
  const negRate = Math.round((counts.Negative / total) * 100);

  const insights: Insight[] = [
    {
      title: "Customer satisfaction analysis",
      body: `Composite satisfaction index is ${csat}/100 across ${total.toLocaleString()} classified mentions, with ${counts.Positive.toLocaleString()} positive and ${counts.Negative.toLocaleString()} negative signals.`,
      tone: csat >= 65 ? "positive" : csat >= 45 ? "neutral" : "negative",
      actions:
        csat >= 65
          ? ["Publish the score in the weekly brand review", "Convert advocates into referenceable case studies"]
          : ["Open a satisfaction recovery workstream", "Prioritise the top negative driver below this quarter"],
    },
    {
      title: "Complaint detection",
      body: `${negRate}% of mentions are negative and ${highRisk} are high-risk escalations that combine negative sentiment with high model confidence.`,
      tone: negRate > 30 ? "negative" : "neutral",
      actions: [
        "Route high-risk items into the support queue within 24h",
        "Tag repeat complainants for proactive outreach",
      ],
    },
  ];

  if (negativeTopic) {
    insights.push({
      title: "Product feedback summary",
      body: `"${negativeTopic.topic}" is the largest complaint driver with ${negativeTopic.Negative ?? 0} negative mentions out of ${negativeTopic.total}.`,
      tone: "negative",
      actions: [
        `Create a remediation epic for ${negativeTopic.topic.toLowerCase()}`,
        "Share verbatims with the owning product team",
      ],
    });
  }

  if (positiveTopic) {
    insights.push({
      title: "Brand reputation analysis",
      body: `Strongest advocacy comes from "${positiveTopic.topic}" with ${positiveTopic.Positive ?? 0} positive mentions — a defensible reputation pillar.`,
      tone: "positive",
      actions: ["Amplify this pillar in campaign messaging", "Brief sales on the proof points"],
    });
  }

  insights.push({
    title: "Market sentiment analysis",
    body: `Signal quality is ${100 - noise}% — ${noise}% of captured content is promotional or bot noise and is excluded from brand-health scoring.`,
    tone: noise > 25 ? "neutral" : "positive",
    actions: ["Tighten collection filters for noisy sources", "Re-baseline trend lines on relevant mentions only"],
  });

  return insights;
}
