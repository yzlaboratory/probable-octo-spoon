import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { News, Sponsor, Vorstand } from "../types";
import { Button, PageHeader } from "../ui";
import * as Icons from "../ui/Icons";
import { formatLongDate, greetingFor } from "./dashboard/format";
import { KpiStrip } from "./dashboard/KpiStrip";
import {
  newsKpi,
  sponsorKpi,
  vorstandKpi,
  type NewsKpi,
  type SponsorKpi,
  type VorstandKpi,
} from "./dashboard/kpi";

interface DashboardData {
  news: News[];
  sponsors: Sponsor[];
  vorstand: Vorstand[];
}

interface DerivedKpis {
  news: NewsKpi;
  sponsors: SponsorKpi;
  vorstand: VorstandKpi;
}

const ZERO_KPIS: DerivedKpis = {
  news: { published: 0, drafts: 0, scheduled: 0, withdrawn: 0 },
  sponsors: { active: 0, paused: 0, archived: 0 },
  vorstand: { active: 0, withoutPortrait: 0 },
};

export default function DashboardPage() {
  const nav = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [news, sponsors, vorstand] = await Promise.all([
          api.get<News[]>("/api/news"),
          api.get<Sponsor[]>("/api/sponsors"),
          api.get<Vorstand[]>("/api/vorstand"),
        ]);
        if (!cancelled) setData({ news, sponsors, vorstand });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unbekannter Fehler");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const kpis: DerivedKpis = data
    ? {
        news: newsKpi(data.news),
        sponsors: sponsorKpi(data.sponsors),
        vorstand: vorstandKpi(data.vorstand),
      }
    : ZERO_KPIS;

  return (
    <div>
      <PageHeader
        eyebrow={`Übersicht · ${formatLongDate(now)}`}
        title={`${greetingFor(now)}.`}
        subtitle="Hier ist, was heute anliegt."
        right={
          <>
            <Button
              kind="ghost"
              leading={<Icons.External size={14} />}
              onClick={() => window.open("/", "_blank", "noopener,noreferrer")}
            >
              Website ansehen
            </Button>
            <Button
              kind="primary"
              leading={<Icons.Plus size={14} />}
              onClick={() => nav("/admin/news/new")}
            >
              Neue Meldung
            </Button>
          </>
        }
      />

      <div className="px-10 pb-14" data-testid="dashboard-body">
        {error && (
          <div
            role="alert"
            className="mb-6 px-4 py-3 rounded-md text-[13px]"
            style={{
              background: "oklch(0.5 0.18 25 / 0.12)",
              color: "var(--accent)",
              border: "1px solid oklch(0.5 0.18 25 / 0.4)",
            }}
          >
            Daten konnten nicht geladen werden: {error}
          </div>
        )}

        <KpiStrip news={kpis.news} sponsors={kpis.sponsors} vorstand={kpis.vorstand} />
      </div>
    </div>
  );
}
