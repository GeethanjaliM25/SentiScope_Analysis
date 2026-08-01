import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalyticsCorpus } from "@/lib/analytics.functions";
import {
  buildBusinessInsights,
  countSentiments,
  satisfactionScore,
  topicFrequency,
  type CorpusRow,
} from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Business Intelligence — SentiScope AI" },
      {
        name: "description",
        content: "Automated customer satisfaction, complaint detection, brand reputation insights and actionable recommendations.",
      },
      { property: "og:title", content: "Business Intelligence — SentiScope AI" },
      { property: "og:description", content: "Automated business insights and recommendations from sentiment data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const fetchCorpus = useServerFn(getAnalyticsCorpus);
  const { data, isLoading } = useQuery({ queryKey: ["corpus"], queryFn: () => fetchCorpus({}) });
  const rows = (data?.rows ?? []) as CorpusRow[];

  const insights = useMemo(() => buildBusinessInsights(rows), [rows]);
  const counts = useMemo(() => countSentiments(rows), [rows]);
  const topics = useMemo(() => topicFrequency(rows), [rows]);
  const risks = useMemo(() => rows.filter((r) => r.risk_level === "high").slice(0, 6), [rows]);
  const csat = satisfactionScore(counts);

  if (isLoading) {
    return (
      <AppShell title="Business Intelligence" description="Automated insights and recommendations">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Business Intelligence" description="Insights, recommendations and risk alerts">
      <div className="space-y-6">
        <section className="panel glow animate-fade-in grid gap-4 p-5 sm:grid-cols-3">
          <Metric label="Satisfaction index" value={`${csat}/100`} />
          <Metric label="Classified mentions" value={rows.length.toLocaleString()} />
          <Metric label="High-risk alerts" value={String(risks.length)} tone="negative" />
        </section>

        {insights.length === 0 ? (
          <p className="panel p-6 text-sm text-muted-foreground">
            Run a real-time analysis or upload a dataset to generate business intelligence.
          </p>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {insights.map((insight, index) => (
              <article
                key={insight.title}
                className="panel animate-fade-in space-y-3 p-5"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">{insight.title}</h2>
                  <Badge
                    variant="secondary"
                    className="ml-auto capitalize"
                    style={{
                      background:
                        insight.tone === "positive"
                          ? "color-mix(in oklab, var(--positive) 18%, transparent)"
                          : insight.tone === "negative"
                            ? "color-mix(in oklab, var(--negative) 18%, transparent)"
                            : undefined,
                    }}
                  >
                    {insight.tone}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.body}</p>
                <ul className="space-y-1.5">
                  {insight.actions.map((action) => (
                    <li key={action} className="flex items-start gap-2 text-sm">
                      <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel animate-fade-in p-5">
            <h2 className="mb-3 text-sm font-semibold">Trending topics</h2>
            <ul className="space-y-2">
              {topics.slice(0, 8).map((topic) => (
                <li key={topic.topic} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{topic.topic}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.round((topic.total / (topics[0]?.total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {topic.total} · {topic.Negative} neg
                  </span>
                </li>
              ))}
              {topics.length === 0 ? <li className="text-sm text-muted-foreground">No topics yet.</li> : null}
            </ul>
          </div>

          <div className="panel animate-fade-in p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-semibold">Risk alerts</h2>
            </div>
            <ul className="space-y-3">
              {risks.map((risk) => (
                <li key={risk.id} className="rounded-lg border border-border p-3">
                  <p className="line-clamp-2 text-sm">{risk.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {risk.topic ?? "General"} · {Math.round(risk.confidence * 100)}% confidence ·{" "}
                    {new Date(risk.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
              {risks.length === 0 ? (
                <li className="text-sm text-muted-foreground">No high-risk mentions detected. </li>
              ) : null}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "negative" }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className="mt-1 text-2xl font-bold"
        style={{ color: tone === "negative" ? "var(--negative)" : "var(--primary)" }}
      >
        {value}
      </p>
    </div>
  );
}
