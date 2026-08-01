import { assembleResult, fallbackPredict, type Sentiment, type SentimentResult } from "./sentiment-core";

type ApiResponse = {
  sentiment?: string;
  label?: string;
  prediction?: string;
  confidence?: number;
  score?: number;
};

const VALID: Sentiment[] = ["Positive", "Negative", "Neutral", "Irrelevant"];

function normalizeSentiment(value: unknown): Sentiment | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase();
  const match = VALID.find((s) => s.toLowerCase() === cleaned);
  return match ?? null;
}

/**
 * Calls the user-hosted FastAPI model service that loads
 * final_sentiment_model.pkl + tfidf.pkl + label_encoder.pkl.
 * Falls back to a deterministic lexicon predictor when unavailable so the
 * product never hard-fails on a cold or missing backend.
 */
export async function predictWithModel(text: string): Promise<SentimentResult> {
  const baseUrl = process.env.SENTIMENT_API_URL?.replace(/\/+$/, "");

  if (baseUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      const response = await fetch(`${baseUrl}/predict`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.SENTIMENT_API_KEY ? { "x-api-key": process.env.SENTIMENT_API_KEY } : {}),
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const payload = (await response.json()) as ApiResponse;
        const sentiment =
          normalizeSentiment(payload.sentiment) ??
          normalizeSentiment(payload.label) ??
          normalizeSentiment(payload.prediction);
        const confidence = Number(payload.confidence ?? payload.score ?? 0.8);
        if (sentiment) {
          return assembleResult(text, { sentiment, confidence: Number.isFinite(confidence) ? confidence : 0.8 }, "model");
        }
      }
      console.error(`[sentiment] model service responded ${response.status}`);
    } catch (error) {
      console.error("[sentiment] model service unreachable", error);
    }
  }

  return assembleResult(text, fallbackPredict(text), "fallback");
}
