import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Cloud } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WordCloud } from "@/components/word-cloud";
import { getAnalyticsCorpus } from "@/lib/analytics.functions";
import { keywordFrequency, topicFrequency, type CorpusRow } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/word-clouds")({
  head: () => ({
    meta: [
      { title: "Word Cloud Analytics — SentiScope AI" },
      {
        name: "description",
        content: "Overall, positive, negative, neutral and topic-based word clouds with keyword rankings and frequency tables.",
      },
      { property: "og:title", content: "Word Cloud Analytics — SentiScope AI" },
      { property: "og:description", content: "Keyword clouds and frequency rankings across your sentiment corpus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WordCloudPage,
});

const TABS = ["Overall", "Positive", "Negative", "Neutral", "Irrelevant", "Trending"] as const;

function WordCloudPage() {
  const fetchCorpus = useServerFn(getAnalyticsCorpus);
  const { data, isLoading } = useQuery({ queryKey: ["corpus"], queryFn: () => fetchCorpus({}) });
  const rows = (data?.rows ?? []) as CorpusRow[];
  const [topic, setTopic] = useState("all");

  const clouds = useMemo(() => {
    const recent = [...rows].slice(0, 400);
    return {
      Overall: keywordFrequency(rows, 60),
      Positive: keywordFrequency(rows.filter((r) => r.sentiment === "Positive"), 50),
      Negative: keywordFrequency(rows.filter((r) => r.sentiment === "Negative"), 50),
      Neutral: keywordFrequency(rows.filter((r) => r.sentiment === "Neutral"), 50),
      Irrelevant: keywordFrequency(rows.filter((r) => r.sentiment === "Irrelevant"), 40),
      Trending: keywordFrequency(recent, 40),
    } as Record<string, { word: string; count: number; rank: number }[]>;
  }, [rows]);

  const topics = useMemo(() => topicFrequency(rows), [rows]);
  const topicCloud = useMemo(
    () => keywordFrequency(topic === "all" ? rows : rows.filter((r) => (r.topic ?? "General") === topic), 45),
    [rows, topic],
  );

  if (isLoading) {
    return (
      <AppShell title="Word Cloud Analytics" description="Keyword clouds and rankings">
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Word Cloud Analytics" description="Overall, per-sentiment and topic-based keyword clouds">
      <div className="space-y-6">
        <Tabs defaultValue="Overall">
          <TabsList className="flex-wrap">
            {TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              <section className="panel animate-fade-in p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">{tab} word cloud</h2>
                  <Badge variant="secondary">{clouds[tab]?.length ?? 0} keywords</Badge>
                </div>
                <WordCloud words={clouds[tab] ?? []} variant={tab} />
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <KeywordTable title="Top 10 keywords" words={(clouds[tab] ?? []).slice(0, 10)} />
                <KeywordTable title="Top 20 keywords" words={(clouds[tab] ?? []).slice(0, 20)} />
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <section className="panel animate-fade-in p-5">
          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h2 className="truncate text-sm font-semibold">Topic-based word cloud</h2>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="w-48 shrink-0">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {topics.map((t) => (
                  <SelectItem key={t.topic} value={t.topic}>
                    {t.topic} ({t.total})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <WordCloud words={topicCloud} variant="Trending" />
        </section>
      </div>
    </AppShell>
  );
}

function KeywordTable({ title, words }: { title: string; words: { word: string; count: number; rank: number }[] }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="max-h-80 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Keyword</TableHead>
              <TableHead className="text-right">Frequency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                  No keywords yet.
                </TableCell>
              </TableRow>
            ) : (
              words.map((w) => (
                <TableRow key={w.word}>
                  <TableCell className="text-xs text-muted-foreground">#{w.rank}</TableCell>
                  <TableCell className="text-sm font-medium">{w.word}</TableCell>
                  <TableCell className="text-right text-sm">{w.count}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
