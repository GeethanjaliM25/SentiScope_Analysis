import { useMemo } from "react";

export type CloudWord = { word: string; count: number };

const PALETTES: Record<string, string[]> = {
  Overall: ["var(--primary)", "var(--positive)", "var(--chart-3)", "var(--chart-4)"],
  Positive: ["var(--positive)", "var(--chart-2)", "var(--primary)"],
  Negative: ["var(--negative)", "var(--chart-5)", "var(--destructive)"],
  Neutral: ["var(--neutral)", "var(--muted-foreground)", "var(--chart-4)"],
  Irrelevant: ["var(--irrelevant)", "var(--muted-foreground)"],
  Trending: ["var(--primary)", "var(--chart-3)", "var(--positive)"],
};

export function WordCloud({
  words,
  variant = "Overall",
  className,
}: {
  words: CloudWord[];
  variant?: keyof typeof PALETTES | string;
  className?: string;
}) {
  const palette = PALETTES[variant] ?? PALETTES.Overall;
  const items = useMemo(() => {
    if (words.length === 0) return [];
    const max = Math.max(...words.map((w) => w.count));
    const min = Math.min(...words.map((w) => w.count));
    const span = Math.max(max - min, 1);
    return words.map((w, index) => ({
      ...w,
      size: 0.85 + ((w.count - min) / span) * 1.75,
      color: palette[index % palette.length],
      opacity: 0.55 + ((w.count - min) / span) * 0.45,
      rotate: index % 7 === 0 ? -4 : index % 5 === 0 ? 3 : 0,
    }));
  }, [words, palette]);

  if (items.length === 0) {
    return (
      <div className={`grid min-h-40 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground ${className ?? ""}`}>
        No keywords yet — analyse some text to populate this cloud.
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-40 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-border bg-muted/30 p-5 ${className ?? ""}`}
    >
      {items.map((item, index) => (
        <span
          key={item.word}
          title={`${item.word} — ${item.count} mentions`}
          className="animate-fade-in cursor-default font-semibold leading-tight transition-transform duration-200 hover:scale-110"
          style={{
            fontSize: `${item.size}rem`,
            color: item.color,
            opacity: item.opacity,
            transform: `rotate(${item.rotate}deg)`,
            animationDelay: `${Math.min(index * 25, 600)}ms`,
          }}
        >
          {item.word}
        </span>
      ))}
    </div>
  );
}
