import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, job_title, company, created_at")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);

    const roleList = (roles ?? []).map((r) => r.role);
    return {
      profile,
      roles: roleList,
      role: roleList.includes("admin") ? "admin" : roleList.includes("analyst") ? "analyst" : "viewer",
    };
  });

const ProfileInput = z.object({
  full_name: z.string().trim().max(100).optional(),
  job_title: z.string().trim().max(100).optional(),
  company: z.string().trim().max(100).optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
