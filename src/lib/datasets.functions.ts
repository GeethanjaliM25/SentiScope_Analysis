import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(160),
        rowCount: z.number().int().min(0).max(500_000),
        textColumn: z.string().trim().max(160),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("datasets")
      .insert({
        user_id: context.userId,
        name: data.name,
        row_count: data.rowCount,
        text_column: data.textColumn,
        status: "processing",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const analyzeBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        datasetId: z.string().uuid(),
        texts: z.array(z.string().trim().min(1).max(2000)).min(1).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { predictWithModel } = await import("./sentiment.server");
    const results = await Promise.all(data.texts.map((text) => predictWithModel(text)));

    const { error } = await context.supabase.from("analyses").insert(
      results.map((result) => ({
        user_id: context.userId,
        dataset_id: data.datasetId,
        text: result.text,
        sentiment: result.sentiment,
        confidence: result.confidence,
        category: result.category,
        topic: result.topic,
        keywords: result.keywords,
        risk_level: result.riskLevel,
        insight: result.insight,
        source: "dataset",
      })),
    );
    if (error) throw new Error(error.message);
    return { results };
  });

export const finalizeDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        datasetId: z.string().uuid(),
        analyzed: z.number().int().min(0),
        positive: z.number().int().min(0),
        negative: z.number().int().min(0),
        neutral: z.number().int().min(0),
        irrelevant: z.number().int().min(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("datasets")
      .update({
        analyzed_count: data.analyzed,
        positive_count: data.positive,
        negative_count: data.negative,
        neutral_count: data.neutral,
        irrelevant_count: data.irrelevant,
        status: "completed",
      })
      .eq("id", data.datasetId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDatasets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("datasets")
      .select(
        "id, name, row_count, analyzed_count, status, text_column, positive_count, negative_count, neutral_count, irrelevant_count, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDatasetRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ datasetId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("analyses")
      .select("id, text, sentiment, confidence, category, topic, keywords, risk_level, created_at")
      .eq("dataset_id", data.datasetId)
      .order("created_at", { ascending: true })
      .limit(2000);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ datasetId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("analyses").delete().eq("dataset_id", data.datasetId);
    const { error } = await context.supabase.from("datasets").delete().eq("id", data.datasetId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
