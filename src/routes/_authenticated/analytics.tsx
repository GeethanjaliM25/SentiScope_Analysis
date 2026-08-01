import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAnalyticsCorpus } from "@/lib/analytics.functions";
import {
  SENTIMENT_COLOR,
  SENTIMENT_ORDER,
  countSentiments,
  keywordFrequency,
  satisfactionScore,
  topicFrequency,
  trendSeries,
  type CorpusRow,
} from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Advanced Analytics — SentiScope AI" },
      {
        name: "description",
        content: "Interactive pie, bar, line, donut and heatmap visualisations with date, dataset and category filters.",
      },
      { property: "og:title", content: "Advanced Analytics — SentiScope AI" },
      { property: "og:description", content: "Filterable sentiment analytics with correlation heatmaps and trends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function AnalyticsPage() {
  const fetchCorpus = useServerFn(getAnalyticsCorpus);
  const { data, isLoading } = useQuery({ queryKey: ["corpus"], queryFn: () => fetchCorpus({}) });
  const allRows = (data?.rows ?? []) as CorpusRow[];
  const datasets = data?.datasets ?? [];

  const [range, setRange] = useState("30");
  const [dataset, setDataset] = useState("all");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => [...new Set(allRows.map((r) => r.category).filter(Boolean) as string[])].sort(),
    [allRows],
  );

  const rows = useMemo(() => {
    const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86_400_000;
    return allRows.filter((r) => {
      if (cutoff && new Date(r.created_at).getTime() < cutoff) return false;
      if (dataset !== "all" && (dataset === "realtime" ? r.dataset_id !== null : r.dataset_id !== dataset)) return false;
      if (category !== "all" && r.category !== category) return false;
      return true;
    });
  }, [allRows, range, dataset, category]);

  const counts = useMemo(() => countSentiments(rows), [rows]);
  const distribution = SENTIMENT_ORDER.map((name) => ({ name, value: counts[name] ?? 0 }));
  const trend = useMemo(() => trendSeries(rows), [rows]);
  const topics = useMemo(() => topicFrequency(rows), [rows]);
  const keywords = useMemo(() => keywordFrequency(rows, 12), [rows]);
  const csat = satisfactionScore(counts);

  if (isLoading) {
    return (
      <AppShell title="Advanced Analytics" description="Interactive dashboards and filters">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </AppShell>
    );
  }

  const maxTopic = Math.max(1, ...topics.map((t) => t.total));

  return (
    <AppShell title="Advanced Analytics" description="Filterable charts, trends and sentiment correlation">
      <div className="space-y-6">
        <section className="panel animate-fade-in flex flex-wrap items-end gap-3 p-4">
          <Filter label="Date range" value={range} onChange={setRange} options={RANGES} />
          <Filter
            label="Dataset"
            value={dataset}
            onChange={setDataset}
            options={[
              { value: "all", label: "All sources" },
              { value: "realtime", label: "Real-time only" },
              ...datasets.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <Filter
            label="Category"
            value={category}
            onChange={setCategory}
            options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary">{rows.length.toLocaleString()} records</Badge>
            <Badge className="bg-primary/15 text-primary">Satisfaction {csat}/100</Badge>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Panel title="Sentiment distribution (pie)">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" outerRadius={92}>
                  {distribution.map((entry) => (
                    <Cell key={entry.name} fill={SENTIMENT_COLOR[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Class distribution (donut)">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
                  {distribution.map((entry) => (
                    <Cell key={entry.name} fill={SENTIMENT_COLOR[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Sentiment counts (bar)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {distribution.map((entry) => (
                    <Cell key={entry.name} fill={SENTIMENT_COLOR[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Keyword frequency (bar)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={keywords} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="word" fontSize={11} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Trend analysis (line)" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend />
                {SENTIMENT_ORDER.map((s) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={SENTIMENT_COLOR[s]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Volume momentum (area)" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="var(--primary)" fill="url(#vol)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </section>

        <section className="panel animate-fade-in p-5">
          <h2 className="text-sm font-semibold">Topic × sentiment heatmap</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Cell intensity reflects mention volume; use it to spot which topics correlate with which sentiment class.
          </p>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records for the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-[160px_repeat(4,minmax(0,1fr))] gap-1 text-xs">
                  <div />
                  {SENTIMENT_ORDER.map((s) => (
                    <div key={s} className="pb-1 text-center font-medium">
                      {s}
                    </div>
                  ))}
                  {topics.map((t) => (
                    <div key={t.topic} className="contents">
                      <div className="truncate py-2 pr-2 font-medium">{t.topic}</div>
                      {SENTIMENT_ORDER.map((s) => {
                        const value = t[s];
                        const intensity = Math.min(1, value / maxTopic);
                        return (
                          <div
                            key={s}
                            title={`${t.topic} · ${s}: ${value}`}
                            className="grid h-10 place-items-center rounded-md font-semibold transition-transform duration-200 hover:scale-105"
                            style={{
                              background: `color-mix(in oklab, ${SENTIMENT_COLOR[s]} ${Math.round(intensity * 85) + 6}%, transparent)`,
                              color: intensity > 0.45 ? "var(--background)" : "var(--foreground)",
                            }}
                          >
                            {value}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`panel animate-fade-in p-5 ${className ?? ""}`}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="h-72">{children}</div>
    </div>
  );
}
