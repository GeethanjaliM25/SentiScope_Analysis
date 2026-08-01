import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  Database,
  Gauge,
  MessageSquare,
  Smile,
  Frown,
  Meh,
  Ban,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard } from "@/lib/sentiment.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SentiScope AI" },
      { name: "description", content: "Sentiment distribution, trends, topics and model metrics across your analyses." },
      { property: "og:title", content: "Dashboard — SentiScope AI" },
      { property: "og:description", content: "Live sentiment intelligence dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const SENTIMENT_COLORS: Record<string, string> = {
  Positive: "var(--positive)",
  Negative: "var(--negative)",
  Neutral: "var(--neutral)",
  Irrelevant: "var(--irrelevant)",
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4" style={{ color: accent ?? "var(--primary)" }} />
      </div>
      <p className="mt-3 text-2xl font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Dashboard() {
  const fetchDashboard = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard({}) });

  if (isLoading || !data) {
    return (
      <AppShell title="Dashboard" description="Sentiment intelligence overview">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  const pieData = Object.entries(data.counts).map(([name, value]) => ({ name, value }));
  const hasData = data.total > 0;

  return (
    <AppShell title="Dashboard" description="Sentiment intelligence overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total analyses" value={data.total} icon={Activity} />
        <StatCard label="Positive" value={data.counts.Positive} icon={Smile} accent="var(--positive)" />
        <StatCard label="Negative" value={data.counts.Negative} icon={Frown} accent="var(--negative)" />
        <StatCard label="Neutral" value={data.counts.Neutral} icon={Meh} accent="var(--neutral)" />
        <StatCard label="Irrelevant" value={data.counts.Irrelevant} icon={Ban} accent="var(--irrelevant)" />
        <StatCard label="Model accuracy" value="81.26%" icon={Gauge} hint="TF-IDF + Logistic Regression" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold">Sentiment distribution</h2>
          <div className="mt-4 h-64">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {pieData.map((entry) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: SENTIMENT_COLORS[entry.name] }} />
                {entry.name}
              </span>
            ))}
          </div>
        </div>

        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Sentiment trend</h2>
          <div className="mt-4 h-64">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  {(["Positive", "Negative", "Neutral", "Irrelevant"] as const).map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={SENTIMENT_COLORS[key]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Most active topics</h2>
          <div className="mt-4 h-56">
            {data.topics.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topics} layout="vertical" margin={{ left: 24 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="topic" width={110} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent analysis history</h2>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="h-3.5 w-3.5" />
              {data.datasetCount} datasets
            </span>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {data.recent.length === 0 ? (
              <li className="py-8 text-center text-sm text-muted-foreground">
                No analyses yet — run your first one from Real-Time Analysis.
              </li>
            ) : (
              data.recent.map((row) => (
                <li key={row.id} className="flex items-start gap-3 py-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{row.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.topic ?? "General"} · {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {row.risk_level === "high" ? (
                      <AlertTriangle className="h-4 w-4 text-[color:var(--negative)]" />
                    ) : null}
                    <Badge variant="outline" style={{ color: SENTIMENT_COLORS[row.sentiment], borderColor: SENTIMENT_COLORS[row.sentiment] }}>
                      {row.sentiment} · {Math.round(Number(row.confidence) * 100)}%
                    </Badge>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      Not enough data yet
    </div>
  );
}
