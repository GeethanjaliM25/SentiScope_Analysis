import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, Download, FileSpreadsheet, Trash2, UploadCloud, Loader2 } from "lucide-react";
import { Cell, Legend, Pie, PieChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { guessTextColumn, parseCsv, toCsv } from "@/lib/csv";
import { SENTIMENT_COLOR, countSentiments } from "@/lib/insights";
import {
  analyzeBatch,
  createDataset,
  deleteDataset,
  finalizeDataset,
  getDatasetRows,
  listDatasets,
} from "@/lib/datasets.functions";

export const Route = createFileRoute("/_authenticated/datasets")({
  head: () => ({
    meta: [
      { title: "Dataset Analysis — SentiScope AI" },
      {
        name: "description",
        content: "Upload CSV datasets, auto-detect text columns, run bulk sentiment analysis and export analysed results.",
      },
      { property: "og:title", content: "Dataset Analysis — SentiScope AI" },
      { property: "og:description", content: "Bulk CSV sentiment analysis with distribution charts and exports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DatasetsPage,
});

type Analysed = {
  text: string;
  sentiment: string;
  confidence: number;
  category: string;
  keywords: string[];
  topic: string;
};

const BATCH = 20;
const MAX_ROWS = 1200;

function DatasetsPage() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const fetchList = useServerFn(listDatasets);
  const createDatasetFn = useServerFn(createDataset);
  const analyzeBatchFn = useServerFn(analyzeBatch);
  const finalizeFn = useServerFn(finalizeDataset);
  const rowsFn = useServerFn(getDatasetRows);
  const deleteFn = useServerFn(deleteDataset);

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [column, setColumn] = useState(0);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [analysed, setAnalysed] = useState<Analysed[]>([]);

  const { data: datasets } = useQuery({ queryKey: ["datasets"], queryFn: () => fetchList({}) });

  const counts = useMemo(() => countSentiments(analysed), [analysed]);
  const pieData = useMemo(
    () => Object.entries(counts).map(([name, value]) => ({ name, value })),
    [counts],
  );

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    let mergedHeaders: string[] = [];
    const merged: string[][] = [];
    for (const file of Array.from(files)) {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (!parsed.headers.length) continue;
      if (!mergedHeaders.length) mergedHeaders = parsed.headers;
      merged.push(...parsed.rows);
    }
    if (!mergedHeaders.length) {
      toast.error("Could not read a header row from that file.");
      return;
    }
    setFileName(Array.from(files).map((f) => f.name).join(", "));
    setHeaders(mergedHeaders);
    setRows(merged);
    setColumn(guessTextColumn(mergedHeaders, merged));
    setAnalysed([]);
    setProgress(0);
    toast.success(`Loaded ${merged.length.toLocaleString()} rows`);
  }

  async function runAnalysis() {
    if (!rows.length) return;
    setRunning(true);
    setAnalysed([]);
    setProgress(0);
    try {
      const texts = rows
        .map((r) => (r[column] ?? "").trim())
        .filter((t) => t.length > 1)
        .slice(0, MAX_ROWS);

      const dataset = await createDatasetFn({
        data: { name: fileName ?? "Uploaded dataset", rowCount: texts.length, textColumn: headers[column] ?? "text" },
      });

      const collected: Analysed[] = [];
      for (let i = 0; i < texts.length; i += BATCH) {
        const slice = texts.slice(i, i + BATCH);
        const { results } = await analyzeBatchFn({ data: { datasetId: dataset.id, texts: slice } });
        collected.push(...(results as Analysed[]));
        setAnalysed([...collected]);
        setProgress(Math.round(((i + slice.length) / texts.length) * 100));
      }

      const totals = countSentiments(collected);
      await finalizeFn({
        data: {
          datasetId: dataset.id,
          analyzed: collected.length,
          positive: totals.Positive,
          negative: totals.Negative,
          neutral: totals.Neutral,
          irrelevant: totals.Irrelevant,
        },
      });
      await queryClient.invalidateQueries();
      toast.success(`Analysed ${collected.length.toLocaleString()} records`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  }

  function download(name: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv(records: Analysed[]) {
    const csv = toCsv(
      ["text", "predicted_sentiment", "confidence", "category", "topic", "keywords"],
      records.map((r) => [r.text, r.sentiment, r.confidence.toFixed(4), r.category, r.topic, r.keywords.join(" | ")]),
    );
    download("sentiscope-analysis.csv", csv, "text/csv");
  }

  function exportExcel(records: Analysed[]) {
    const head = ["Text", "Predicted Sentiment", "Confidence", "Category", "Topic", "Keywords"];
    const escape = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
<table border="1"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>
${records
  .map(
    (r) =>
      `<tr><td>${escape(r.text)}</td><td>${r.sentiment}</td><td>${(r.confidence * 100).toFixed(2)}%</td><td>${escape(r.category)}</td><td>${escape(r.topic)}</td><td>${escape(r.keywords.join(", "))}</td></tr>`,
  )
  .join("")}
</tbody></table></body></html>`;
    download("sentiscope-report.xls", html, "application/vnd.ms-excel");
  }

  const exportStored = useMutation({
    mutationFn: async (datasetId: string) => rowsFn({ data: { datasetId } }),
    onSuccess: (data) =>
      exportCsv(
        (data as any[]).map((r) => ({
          text: r.text,
          sentiment: r.sentiment,
          confidence: Number(r.confidence),
          category: r.category ?? "",
          topic: r.topic ?? "",
          keywords: r.keywords ?? [],
        })),
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDataset = useMutation({
    mutationFn: async (datasetId: string) => deleteFn({ data: { datasetId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Dataset deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Dataset Analysis" description="Bulk CSV sentiment analysis, preview and export">
      <div className="space-y-6">
        <section className="panel animate-fade-in p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="min-w-0 space-y-2">
              <h2 className="text-base font-semibold">Upload CSV datasets</h2>
              <p className="text-sm text-muted-foreground">
                Multiple files are merged when headers match. Up to {MAX_ROWS.toLocaleString()} rows are classified per run.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => fileInput.current?.click()} variant="secondary">
                  <UploadCloud className="mr-2 h-4 w-4" /> Choose CSV files
                </Button>
                {headers.length > 0 ? (
                  <Select value={String(column)} onValueChange={(v) => setColumn(Number(v))}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Text column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h, index) => (
                        <SelectItem key={`${h}-${index}`} value={String(index)}>
                          {h || `Column ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
              {fileName ? (
                <p className="text-xs text-muted-foreground">
                  {fileName} · {rows.length.toLocaleString()} rows · text column:{" "}
                  <span className="font-medium text-foreground">{headers[column]}</span>
                </p>
              ) : null}
            </div>
            <Button onClick={runAnalysis} disabled={!rows.length || running} className="glow">
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Analyse dataset
            </Button>
          </div>

          {running || progress > 0 ? (
            <div className="mt-4 space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {progress}% complete · {analysed.length.toLocaleString()} records classified
              </p>
            </div>
          ) : null}
        </section>

        {rows.length > 0 ? (
          <section className="panel animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Dataset preview</h2>
              <Badge variant="secondary">first 8 rows</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h, i) => (
                      <TableHead key={`${h}-${i}`} className={i === column ? "text-primary" : undefined}>
                        {h || `Column ${i + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 8).map((row, ri) => (
                    <TableRow key={ri}>
                      {headers.map((_, ci) => (
                        <TableCell key={ci} className="max-w-[280px] truncate text-xs">
                          {row[ci]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        ) : null}

        {analysed.length > 0 ? (
          <>
            <section className="grid gap-4 md:grid-cols-2">
              <div className="panel animate-fade-in p-5">
                <h2 className="mb-3 text-sm font-semibold">Sentiment distribution</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={SENTIMENT_COLOR[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="panel animate-fade-in p-5">
                <h2 className="mb-3 text-sm font-semibold">Sentiment counts</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pieData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={SENTIMENT_COLOR[entry.name]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="panel animate-fade-in overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div>
                  <h2 className="text-sm font-semibold">Analysed records</h2>
                  <p className="text-xs text-muted-foreground">
                    {analysed.length.toLocaleString()} records · {counts.Positive} positive · {counts.Negative} negative ·{" "}
                    {counts.Neutral} neutral · {counts.Irrelevant} irrelevant
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => exportCsv(analysed)}>
                    <Download className="mr-2 h-4 w-4" /> CSV
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => exportExcel(analysed)}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                  </Button>
                </div>
              </div>
              <div className="max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original text</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Keywords</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysed.slice(0, 300).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="max-w-[360px] truncate text-xs">{row.text}</TableCell>
                        <TableCell>
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ background: `color-mix(in oklab, ${SENTIMENT_COLOR[row.sentiment]} 18%, transparent)`, color: SENTIMENT_COLOR[row.sentiment] }}
                          >
                            {row.sentiment}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{(row.confidence * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-xs">{row.category}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {row.keywords.join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        ) : null}

        <section className="panel animate-fade-in overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Dataset library</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Distribution</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(datasets ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No datasets yet — upload a CSV above to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  (datasets ?? []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="max-w-[220px] truncate text-sm font-medium">{d.name}</TableCell>
                      <TableCell className="text-xs">
                        {d.analyzed_count.toLocaleString()} / {d.row_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.positive_count}P · {d.negative_count}N · {d.neutral_count}Nu · {d.irrelevant_count}I
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.status === "completed" ? "secondary" : "outline"} className="capitalize">
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => exportStored.mutate(d.id)}
                          disabled={exportStored.isPending}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeDataset.mutate(d.id)}
                          disabled={removeDataset.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
