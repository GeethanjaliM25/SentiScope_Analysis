import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WordCloud } from "@/components/word-cloud";
import { toCsv } from "@/lib/csv";
import { getAnalyticsCorpus } from "@/lib/analytics.functions";
import {
  buildBusinessInsights,
  countSentiments,
  keywordFrequency,
  satisfactionScore,
  topicFrequency,
  type CorpusRow,
} from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Export — SentiScope AI" },
      {
        name: "description",
        content: "Generate academic, industry and research sentiment reports and export them as PDF, CSV or Excel.",
      },
      { property: "og:title", content: "Reports & Export — SentiScope AI" },
      { property: "og:description", content: "Executive sentiment reports with charts, keywords and insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const TEMPLATES = [
  { value: "academic", label: "Academic Report" },
  { value: "industry", label: "Industry Report" },
  { value: "research", label: "Research Report" },
];

function ReportsPage() {
  const fetchCorpus = useServerFn(getAnalyticsCorpus);
  const { data } = useQuery({ queryKey: ["corpus"], queryFn: () => fetchCorpus({}) });
  const rows = (data?.rows ?? []) as CorpusRow[];
  const [template, setTemplate] = useState("industry");

  const counts = useMemo(() => countSentiments(rows), [rows]);
  const keywords = useMemo(() => keywordFrequency(rows, 20), [rows]);
  const topics = useMemo(() => topicFrequency(rows), [rows]);
  const insights = useMemo(() => buildBusinessInsights(rows), [rows]);
  const csat = satisfactionScore(counts);
  const total = rows.length;

  function download(name: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const width = doc.internal.pageSize.getWidth();
      let y = 56;

      const line = (text: string, size = 11, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        for (const chunk of doc.splitTextToSize(text, width - 88) as string[]) {
          if (y > 780) {
            doc.addPage();
            y = 56;
          }
          doc.text(chunk, 44, y);
          y += size + 5;
        }
      };

      line("SentiScope AI", 20, true);
      line(`${TEMPLATES.find((t) => t.value === template)?.label} — Sentiment Intelligence`, 13, true);
      line(`Generated ${new Date().toLocaleString()}`, 9);
      y += 8;

      line("Executive Summary", 14, true);
      line(
        `This report covers ${total.toLocaleString()} classified records produced by a tuned Logistic Regression model with 81.26% held-out accuracy. The composite satisfaction index is ${csat}/100, with ${counts.Positive} positive, ${counts.Negative} negative, ${counts.Neutral} neutral and ${counts.Irrelevant} irrelevant mentions.`,
      );
      y += 6;

      line("Dataset Statistics", 14, true);
      line(`Total records analysed: ${total.toLocaleString()}`);
      line(`Distinct topics detected: ${topics.length}`);
      line(`Model: Tuned Logistic Regression (C = 10), TF-IDF features, 71,656 training records`);
      y += 6;

      line("Sentiment Distribution", 14, true);
      for (const [label, value] of Object.entries(counts)) {
        const pct = total ? Math.round((value / total) * 100) : 0;
        line(`${label}: ${value} (${pct}%)  ${"#".repeat(Math.round(pct / 3))}`);
      }
      y += 6;

      line("Top Keywords", 14, true);
      line(keywords.map((k) => `${k.rank}. ${k.word} (${k.count})`).join("   "));
      y += 6;

      line("Topic Breakdown", 14, true);
      for (const topic of topics.slice(0, 10)) {
        line(`${topic.topic}: ${topic.total} mentions — ${topic.Positive} pos / ${topic.Negative} neg`);
      }
      y += 6;

      line("Business Insights", 14, true);
      for (const insight of insights) {
        line(insight.title, 12, true);
        line(insight.body);
        for (const action of insight.actions) line(`- ${action}`, 10);
        y += 4;
      }

      line("Conclusions", 14, true);
      line(
        csat >= 65
          ? "Overall sentiment is healthy. Maintain current service levels, amplify advocacy in owned channels and continue monitoring complaint drivers for regression."
          : "Sentiment indicates measurable dissatisfaction. Prioritise the leading complaint driver, resolve high-risk escalations within 24 hours and re-measure after remediation.",
      );

      doc.save(`sentiscope-${template}-report.pdf`);
      toast.success("PDF report generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate PDF");
    }
  }

  function exportCsv() {
    download(
      "sentiscope-records.csv",
      toCsv(
        ["text", "sentiment", "confidence", "category", "topic", "risk_level", "created_at"],
        rows.map((r) => [r.text, r.sentiment, Number(r.confidence).toFixed(4), r.category ?? "", r.topic ?? "", r.risk_level, r.created_at]),
      ),
      "text/csv",
    );
  }

  function exportExcel() {
    const html = `<html><head><meta charset="utf-8"></head><body><h2>SentiScope AI Report</h2>
<table border="1"><tr><th>Sentiment</th><th>Count</th></tr>${Object.entries(counts)
      .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
      .join("")}</table>
<h3>Top keywords</h3><table border="1"><tr><th>Rank</th><th>Keyword</th><th>Frequency</th></tr>${keywords
      .map((k) => `<tr><td>${k.rank}</td><td>${k.word}</td><td>${k.count}</td></tr>`)
      .join("")}</table></body></html>`;
    download("sentiscope-report.xls", html, "application/vnd.ms-excel");
  }

  return (
    <AppShell title="Reports & Export" description="Executive reporting in PDF, CSV and Excel">
      <div className="space-y-6">
        <section className="panel animate-fade-in flex flex-wrap items-end gap-3 p-5">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Report template</p>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button onClick={exportPdf} className="glow" disabled={!total}>
              <FileText className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button variant="secondary" onClick={exportCsv} disabled={!total}>
              <FileDown className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="secondary" onClick={exportExcel} disabled={!total}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
          </div>
        </section>

        <section className="panel animate-fade-in space-y-4 p-6">
          <header>
            <h2 className="text-lg font-bold">Report preview</h2>
            <p className="text-sm text-muted-foreground">
              {TEMPLATES.find((t) => t.value === template)?.label} · {total.toLocaleString()} records · satisfaction {csat}/100
            </p>
          </header>

          <div className="grid gap-3 sm:grid-cols-4">
            {Object.entries(counts).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Keyword cloud</h3>
            <WordCloud words={keywords} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Business insights</h3>
            {insights.map((insight) => (
              <div key={insight.title} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="text-sm text-muted-foreground">{insight.body}</p>
              </div>
            ))}
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Analyse data to populate the report.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
