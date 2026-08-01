import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccount, updateProfile } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — SentiScope AI" },
      { name: "description", content: "Manage your SentiScope AI profile details, role and session." },
      { property: "og:title", content: "Profile — SentiScope AI" },
      { property: "og:description", content: "Manage your account details and role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getAccount);
  const saveProfile = useServerFn(updateProfile);
  const { data, isLoading } = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount({}) });

  const [form, setForm] = useState({ full_name: "", job_title: "", company: "" });

  useEffect(() => {
    if (data?.profile) {
      setForm({
        full_name: data.profile.full_name ?? "",
        job_title: data.profile.job_title ?? "",
        company: data.profile.company ?? "",
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => saveProfile({ data: form }),
    onSuccess: () => {
      toast.success("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title="Profile" description="Account details and access level">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Personal details</h2>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  maxLength={100}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job title</Label>
                  <Input
                    id="job_title"
                    maxLength={100}
                    value={form.job_title}
                    onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    maxLength={100}
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </form>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Access</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-1 break-all">{data?.profile?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="mt-1">
                <Badge className="capitalize">{data?.role ?? "viewer"}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Member since</dt>
              <dd className="mt-1">
                {data?.profile?.created_at
                  ? new Date(data.profile.created_at).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </AppShell>
  );
}
