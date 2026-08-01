import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SentiScope AI — Enterprise Sentiment Intelligence" },
      {
        name: "description",
        content:
          "Analyze tweets, reviews and support tickets in real time with a trained sentiment model, live dashboards and automated business insights.",
      },
      { property: "og:title", content: "SentiScope AI — Enterprise Sentiment Intelligence" },
      {
        property: "og:description",
        content:
          "Analyze tweets, reviews and support tickets in real time with a trained sentiment model, live dashboards and automated business insights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const highlights = [
  {
    icon: Sparkles,
    title: "Real-time classification",
    body: "Positive, Negative, Neutral and Irrelevant labels with confidence scores from your trained TF-IDF + Logistic Regression model.",
  },
  {
    icon: BarChart3,
    title: "Decision-ready dashboards",
    body: "Sentiment distribution, trend lines, topic frequency and recent activity in one enterprise console.",
  },
  {
    icon: ShieldCheck,
    title: "Brand risk signals",
    body: "Automatic risk scoring and business insight summaries surface complaints before they escalate.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Radar className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">SentiScope AI</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:pt-20">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Enterprise sentiment intelligence
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
          Turn social noise into <span className="text-gradient-brand">measurable</span> customer
          intelligence.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          SentiScope AI scores tweets, reviews, tickets and product feedback against your trained
          sentiment model — then converts the output into topics, risk indicators and business
          recommendations your teams can act on.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/auth">
              Open the console
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <dl className="mt-16 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="panel p-5">
              <item.icon className="h-5 w-5 text-primary" />
              <dt className="mt-4 text-sm font-semibold">{item.title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</dd>
            </div>
          ))}
        </dl>

        <div className="panel mt-6 flex flex-wrap items-center gap-8 p-6">
          <div>
            <p className="text-3xl font-semibold">81.26%</p>
            <p className="text-xs text-muted-foreground">Model accuracy</p>
          </div>
          <div>
            <p className="text-3xl font-semibold">4</p>
            <p className="text-xs text-muted-foreground">Sentiment classes</p>
          </div>
          <div>
            <p className="text-3xl font-semibold">&lt;1s</p>
            <p className="text-xs text-muted-foreground">Typical inference</p>
          </div>
        </div>
      </section>
    </div>
  );
}
