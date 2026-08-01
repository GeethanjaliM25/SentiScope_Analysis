import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Full analytics corpus for the current user (admins see everything through RLS).
 * Powers advanced charts, word clouds, business insights and reports.
 */
export const getAnalyticsCorpus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rows, error }, { data: datasets }] = await Promise.all([
      context.supabase
        .from("analyses")
        .select(
          "id, dataset_id, text, sentiment, confidence, category, topic, keywords, risk_level, source, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(4000),
      context.supabase.from("datasets").select("id, name, created_at").order("created_at", { ascending: false }),
    ]);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], datasets: datasets ?? [] };
  });
