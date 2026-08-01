import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, Loader2, ShieldAlert, Tags, Target } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { analyzeText } from "@/lib/sentiment.functions";

export const Route = createFileRoute("/_authenticated/analyze")({
  head: () => ({
    meta: [
      { title: "Real-Time Analysis — SentiScope AI" },
      { name: "description", content: "Score tweets, reviews and support messages instantly with sentiment, topic, keywords and risk." },
      { property: "og:title", content: "Real-Time Analysis — SentiScope AI" },
      { property: "og:description", content: "Instant sentiment scoring with business insight summaries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analyze,
});

const COLORS: Record<string, string> = {
  Positive: "var(--positive)",
  Negative: "var(--negative)",
  Neutral: "var(--neutral)",
  Irrelevant: "var(--irrelevant)",
};

const SAMPLES = [
  "The new update keeps crashing every time I open the app. Support hasn't replied in three days.",
  "Absolutely love the redesign — checkout is so much faster than before!",
  "Package arrived on Tuesday as scheduled.",
];

function Analyze() {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();
  const runAnalysis = useServerFn(analyzeText);

  const mutation = useMutation({
    mutationFn: (value: string) => runAnalysis({ data: { text: value } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const result = mutation.data;

  return (
    <AppShell title="Real-Time Analysis" description="Score any customer message against the trained model">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Input</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tweets, reviews, social comments or product feedback — up to 2000 characters.
          </p>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            rows={9}
            placeholder="Paste a tweet, review or support message…"
            className="mt-4 resize-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => mutation.mutate(text)}
              disabled={mutation.isPending || text.trim().length < 2}
            >
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Analyze sentiment
            </Button>
            <span className="text-xs text-muted-foreground">{text.length}/2000</span>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Try a sample</p>
            {SAMPLES.map((sample) => (
              <button
                key={sample}
                onClick={() => setText(sample)}
                className="block w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Result</h2>
          {!result ? (
            <div className="mt-10 grid place-items-center text-center text-sm text-muted-foreground">
              Run an analysis to see sentiment, confidence, topic, keywords, risk and the business
              insight summary.
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <div className="flex items-center justify-between">
                <span
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold"
                  style={{
                    color: COLORS[result.sentiment],
                    background: `color-mix(in oklab, ${COLORS[result.sentiment]} 14%, transparent)`,
                  }}
                >
                  {result.sentiment}
                </span>
                <Badge variant={result.riskLevel === "high" ? "destructive" : "secondary"} className="capitalize">
                  <ShieldAlert className="mr-1 h-3 w-3" />
                  {result.riskLevel} risk
                </Badge>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Confidence</span>
                  <span>{Math.round(result.confidence * 100)}%</span>
                </div>
                <Progress value={result.confidence * 100} className="mt-2" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5" /> Topic
                  </p>
                  <p className="mt-1 text-sm font-medium">{result.topic}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Tags className="h-3.5 w-3.5" /> Category
                  </p>
                  <p className="mt-1 text-sm font-medium">{result.category}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Extracted keywords</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.keywords.length ? (
                    result.keywords.map((keyword) => (
                      <Badge key={keyword} variant="outline">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None detected</span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5" /> Business insight
                </p>
                <p className="mt-2 text-sm leading-relaxed">{result.insight}</p>
              </div>

              {result.source === "fallback" ? (
                <p className="text-xs text-muted-foreground">
                  Scored with the built-in fallback classifier — the FastAPI model service is not
                  configured or was unreachable.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
