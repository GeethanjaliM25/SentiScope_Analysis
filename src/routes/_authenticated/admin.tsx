import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Database, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminOverview, setUserRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — SentiScope AI" },
      {
        name: "description",
        content: "Manage users and roles, monitor datasets, review activity logs and platform-wide analytics.",
      },
      { property: "og:title", content: "Admin Panel — SentiScope AI" },
      { property: "og:description", content: "User management, dataset oversight and activity monitoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getAdminOverview);
  const setRole = useServerFn(setUserRole);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview({}),
    retry: false,
  });

  const roleMutation = useMutation({
    mutationFn: async (input: { userId: string; role: "admin" | "analyst" | "viewer" }) => setRole({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) {
    return (
      <AppShell title="Admin Panel" description="Restricted area">
        <div className="panel p-6">
          <h2 className="text-base font-semibold">Administrator access required</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account does not have the admin role. Ask a platform administrator to grant access.
          </p>
        </div>
      </AppShell>
    );
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Admin Panel" description="Users, datasets and activity">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin Panel" description="User management, dataset oversight and activity logs">
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Users} label="Users" value={data.totals.users} />
          <Stat icon={Activity} label="Analyses" value={data.totals.analyses} />
          <Stat icon={Database} label="Datasets" value={data.totals.datasets} />
          <Stat icon={ShieldCheck} label="High-risk items" value={data.totals.highRisk} />
        </section>

        <section className="panel animate-fade-in overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">User management</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Analyses</TableHead>
                  <TableHead>Datasets</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-sm font-medium">{user.full_name ?? "Unnamed"}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell className="text-xs">{user.company ?? "—"}</TableCell>
                    <TableCell className="text-xs">{user.stats.analyses}</TableCell>
                    <TableCell className="text-xs">{user.stats.datasets}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(role) =>
                          roleMutation.mutate({ userId: user.id, role: role as "admin" | "analyst" | "viewer" })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="analyst">Analyst</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel animate-fade-in overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Dataset management</h2>
            </div>
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.datasets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                        No datasets uploaded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.datasets.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="max-w-[180px] truncate text-sm">{d.name}</TableCell>
                        <TableCell className="text-xs">{d.owner}</TableCell>
                        <TableCell className="text-xs">
                          {d.analyzed_count}/{d.row_count}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {d.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="panel animate-fade-in overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Activity log</h2>
            </div>
            <ul className="max-h-80 divide-y divide-border overflow-auto">
              {data.activity.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{entry.actor}</p>
                      <p className="truncate text-xs text-muted-foreground">{entry.detail}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
              {data.activity.length === 0 ? (
                <li className="px-5 py-6 text-sm text-muted-foreground">No activity recorded yet.</li>
              ) : null}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="panel animate-fade-in p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
