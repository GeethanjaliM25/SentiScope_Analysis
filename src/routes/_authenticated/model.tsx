import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Cpu, Database, Layers, Sparkles } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/model")({
  head: () => ({
    meta: [
      { title: "Model Information — SentiScope AI" },
      { name: "description", content: "Pipeline, hyperparameters, confusion matrix and classification report for the 81.26% accuracy sentiment model." },
      { property: "og:title", content: "Model Information — SentiScope AI" },
      { property: "og:description", content: "TF-IDF + Logistic Regression sentiment model details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModelInfo,
});

const PIPELINE = [
  { step: "Text cleaning", detail: "Lowercasing, URL/mention stripping, punctuation removal, stop-word filtering" },
  { step: "TF-IDF vectorization", detail: "Word-level n-grams (1,2), sublinear term frequency, fitted vocabulary from tfidf.pkl" },
  { step: "Logistic Regression", detail: "Multinomial solver with class balancing, loaded from final_sentiment_model.pkl" },
  { step: "Label decoding", detail: "Four-class inverse transform via label_encoder.pkl" },
];

const CLASSES = ["Positive", "Negative", "Neutral", "Irrelevant"] as const;

const REPORT = [
  { label: "Positive", precision: 0.83, recall: 0.8, f1: 0.81, support: 5372 },
  { label: "Negative", precision: 0.84, recall: 0.86, f1: 0.85, support: 6090 },
  { label: "Neutral", precision: 0.79, recall: 0.78, f1: 0.78, support: 4820 },
  { label: "Irrelevant", precision: 0.77, recall: 0.79, f1: 0.78, support: 3120 },
];

const CONFUSION = [
  [4298, 402, 480, 192],
  [351, 5237, 356, 146],
  [468, 379, 3760, 213],
  [204, 168, 284, 2464],
];

const TUNING = [
  { params: "C = 0.5, ngram (1,1)", accuracy: 0.7712 },
  { params: "C = 1.0, ngram (1,1)", accuracy: 0.7894 },
  { params: "C = 1.0, ngram (1,2)", accuracy: 0.8041 },
  { params: "C = 4.0, ngram (1,2)", accuracy: 0.8126 },
];

function ModelInfo() {
  return (
    <AppShell title="Model Information" description="Training pipeline and evaluation metrics">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="panel p-4">
          <Cpu className="h-4 w-4 text-primary" />
          <p className="mt-3 text-2xl font-semibold">81.26%</p>
          <p className="text-xs text-muted-foreground">Final test accuracy</p>
        </div>
        <div className="panel p-4">
          <Database className="h-4 w-4 text-primary" />
          <p className="mt-3 text-2xl font-semibold">74,682</p>
          <p className="text-xs text-muted-foreground">Training records</p>
        </div>
        <div className="panel p-4">
          <Layers className="h-4 w-4 text-primary" />
          <p className="mt-3 text-2xl font-semibold">4</p>
          <p className="text-xs text-muted-foreground">Sentiment classes</p>
        </div>
        <div className="panel p-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="mt-3 text-2xl font-semibold">TF-IDF</p>
          <p className="text-xs text-muted-foreground">Feature extraction</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Prediction pipeline</h2>
          <ol className="mt-4 space-y-3">
            {PIPELINE.map((item, index) => (
              <li key={item.step} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.step}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Hyperparameter tuning</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TUNING}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="params" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                <YAxis domain={[0.7, 0.85]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Bar dataKey="accuracy" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--positive)]" />
            Selected: C = 4.0 with bigram features
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Confusion matrix</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">Actual \ Predicted</th>
                  {CLASSES.map((label) => (
                    <th key={label} className="p-2 text-xs font-medium text-muted-foreground">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CONFUSION.map((row, i) => (
                  <tr key={CLASSES[i]}>
                    <td className="p-2 text-xs font-medium text-muted-foreground">{CLASSES[i]}</td>
                    {row.map((value, j) => (
                      <td key={j} className="p-1">
                        <div
                          className="rounded-md p-2 text-center text-xs font-medium"
                          style={{
                            background: `color-mix(in oklab, var(--primary) ${
                              i === j ? 32 : Math.min(18, value / 40)
                            }%, transparent)`,
                          }}
                        >
                          {value.toLocaleString()}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Classification report</h2>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Precision</TableHead>
                <TableHead>Recall</TableHead>
                <TableHead>F1</TableHead>
                <TableHead className="text-right">Support</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {REPORT.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell>{row.precision.toFixed(2)}</TableCell>
                  <TableCell>{row.recall.toFixed(2)}</TableCell>
                  <TableCell>{row.f1.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.support.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Weighted accuracy</span>
              <span>81.26%</span>
            </div>
            <Progress value={81.26} className="mt-2" />
          </div>
        </div>
      </div>

      <div className="panel mt-4 p-5">
        <h2 className="text-sm font-semibold">Future scope</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Live Twitter API integration",
            "Multi-language sentiment analysis",
            "Deep learning models (BERT)",
            "Real-time monitoring dashboard",
            "Customer feedback intelligence",
          ].map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
