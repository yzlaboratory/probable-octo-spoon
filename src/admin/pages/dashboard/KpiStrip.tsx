import { Card } from "../../ui";
import type { NewsKpi, SponsorKpi, VorstandKpi } from "./kpi";
import { newsSubline, sponsorSubline, vorstandSubline } from "./kpi";

type Tone = "primary" | "accent" | "warn" | "tertiary";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub: string;
  tone: Tone;
  /** When true, render a muted "Bald verfügbar" footnote instead of `sub`. */
  muted?: boolean;
}

const TONE_VARS: Record<Tone, { color: string; glow: string }> = {
  primary: { color: "var(--primary)", glow: "oklch(0.62 0.22 290 / 0.25)" },
  accent: { color: "var(--accent)", glow: "oklch(0.72 0.19 25 / 0.22)" },
  warn: { color: "var(--warn)", glow: "oklch(0.78 0.16 85 / 0.18)" },
  tertiary: { color: "var(--tertiary)", glow: "oklch(0.58 0.22 330 / 0.22)" },
};

function KpiCard({ label, value, sub, tone, muted = false }: KpiCardProps) {
  const t = TONE_VARS[tone];
  return (
    <Card padded={false} className="relative overflow-hidden p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(circle at 0% 0%, ${t.glow}, transparent 60%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute top-0 right-0 left-0 h-[2px]"
        style={{ background: t.color, boxShadow: `0 0 20px ${t.glow}` }}
      />
      <div
        className="caps relative text-[10.5px]"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </div>
      <div
        className={`font-display relative mt-2 text-[40px] leading-none ${muted ? "opacity-60" : ""}`}
      >
        {value}
      </div>
      <div
        className="relative mt-2 text-[12px]"
        style={{ color: "var(--ink-3)" }}
      >
        {sub}
      </div>
    </Card>
  );
}

export interface KpiStripProps {
  news: NewsKpi;
  sponsors: SponsorKpi;
  vorstand: VorstandKpi;
}

export function KpiStrip({ news, sponsors, vorstand }: KpiStripProps) {
  return (
    <div className="mb-8 grid grid-cols-4 gap-4">
      <KpiCard
        label="Meldungen"
        value={news.published}
        sub={newsSubline(news)}
        tone="primary"
      />
      <KpiCard
        label="Seitenaufrufe / 7 T."
        value="—"
        sub="Bald verfügbar"
        tone="accent"
        muted
      />
      <KpiCard
        label="Aktive Sponsoren"
        value={sponsors.active}
        sub={sponsorSubline(sponsors)}
        tone="tertiary"
      />
      <KpiCard
        label="Vorstandsmitglieder"
        value={vorstand.active}
        sub={vorstandSubline(vorstand)}
        tone="warn"
      />
    </div>
  );
}
