import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TextInput = z.object({ text: z.string().trim().min(2).max(2000) });

export const analyzeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TextInput.parse(input))
  .handler(async ({ data, context }) => {
    const { predictWithModel } = await import("./sentiment.server");
    const result = await predictWithModel(data.text);

    const { data: row, error } = await context.supabase
      .from("analyses")
      .insert({
        user_id: context.userId,
        text: result.text,
        sentiment: result.sentiment,
        confidence: result.confidence,
        category: result.category,
        topic: result.topic,
        keywords: result.keywords,
        risk_level: result.riskLevel,
        insight: result.insight,
        source: "realtime",
      })
      .select("id, created_at")
      .single();

    if (error) throw new Error(error.message);
    return { ...result, id: row.id, createdAt: row.created_at };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rows, error }, { count: datasetCount }] = await Promise.all([
      context.supabase
        .from("analyses")
        .select("id, text, sentiment, confidence, topic, risk_level, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      context.supabase.from("datasets").select("id", { count: "exact", head: true }),
    ]);

    if (error) throw new Error(error.message);
    const analyses = rows ?? [];

    const counts = { Positive: 0, Negative: 0, Neutral: 0, Irrelevant: 0 } as Record<string, number>;
    const topics = new Map<string, number>();
    const trend = new Map<string, { date: string; Positive: number; Negative: number; Neutral: number; Irrelevant: number }>();

    for (const row of analyses) {
      counts[row.sentiment] = (counts[row.sentiment] ?? 0) + 1;
      if (row.topic) topics.set(row.topic, (topics.get(row.topic) ?? 0) + 1);
      const date = new Date(row.created_at).toISOString().slice(0, 10);
      const bucket =
        trend.get(date) ?? { date, Positive: 0, Negative: 0, Neutral: 0, Irrelevant: 0 };
      bucket[row.sentiment as "Positive" | "Negative" | "Neutral" | "Irrelevant"] += 1;
      trend.set(date, bucket);
    }

    return {
      total: analyses.length,
      counts,
      datasetCount: datasetCount ?? 0,
      recent: analyses.slice(0, 8),
      topics: [...topics.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([topic, count]) => ({ topic, count })),
      trend: [...trend.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
    };
  });

export const deleteAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("analyses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
