import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden: admin role required");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const [{ data: profiles }, { data: roles }, { data: analyses }, { data: datasets }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, full_name, job_title, company, created_at")
        .order("created_at", { ascending: false }),
      context.supabase.from("user_roles").select("user_id, role"),
      context.supabase
        .from("analyses")
        .select("id, user_id, sentiment, confidence, risk_level, source, text, created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      context.supabase
        .from("datasets")
        .select("id, user_id, name, row_count, analyzed_count, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
    }

    const perUser = new Map<string, { analyses: number; datasets: number; lastActive: string | null }>();
    for (const a of analyses ?? []) {
      const entry = perUser.get(a.user_id) ?? { analyses: 0, datasets: 0, lastActive: null };
      entry.analyses += 1;
      if (!entry.lastActive || a.created_at > entry.lastActive) entry.lastActive = a.created_at;
      perUser.set(a.user_id, entry);
    }
    for (const d of datasets ?? []) {
      const entry = perUser.get(d.user_id) ?? { analyses: 0, datasets: 0, lastActive: null };
      entry.datasets += 1;
      if (!entry.lastActive || d.created_at > entry.lastActive) entry.lastActive = d.created_at;
      perUser.set(d.user_id, entry);
    }

    const users = (profiles ?? []).map((p) => ({
      ...p,
      roles: roleMap.get(p.id) ?? [],
      role: (roleMap.get(p.id) ?? []).includes("admin")
        ? "admin"
        : (roleMap.get(p.id) ?? []).includes("analyst")
          ? "analyst"
          : (roleMap.get(p.id) ?? [])[0] ?? "viewer",
      stats: perUser.get(p.id) ?? { analyses: 0, datasets: 0, lastActive: null },
    }));

    const nameFor = (id: string) =>
      users.find((u) => u.id === id)?.full_name ?? users.find((u) => u.id === id)?.email ?? "Unknown user";

    const activity = [
      ...(analyses ?? []).slice(0, 40).map((a) => ({
        id: `a-${a.id}`,
        kind: "analysis" as const,
        actor: nameFor(a.user_id),
        detail: `${a.sentiment} · ${a.source} · "${String(a.text).slice(0, 60)}"`,
        risk: a.risk_level as string,
        createdAt: a.created_at as string,
      })),
      ...(datasets ?? []).slice(0, 20).map((d) => ({
        id: `d-${d.id}`,
        kind: "dataset" as const,
        actor: nameFor(d.user_id),
        detail: `Dataset "${d.name}" · ${d.analyzed_count}/${d.row_count} rows · ${d.status}`,
        risk: "low",
        createdAt: d.created_at as string,
      })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 40);

    return {
      users,
      datasets: (datasets ?? []).map((d) => ({ ...d, owner: nameFor(d.user_id) })),
      activity,
      totals: {
        users: users.length,
        analyses: (analyses ?? []).length,
        datasets: (datasets ?? []).length,
        highRisk: (analyses ?? []).filter((a) => a.risk_level === "high").length,
      },
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "analyst", "viewer"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
