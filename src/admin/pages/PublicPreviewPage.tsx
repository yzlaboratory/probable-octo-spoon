import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { CLUB_DOMAIN } from "../shell/club";
import type { News } from "../types";
import { Button, PageHeader } from "../ui";
import * as Icons from "../ui/Icons";

type Device = "desktop" | "tablet" | "mobile";

interface PageEntry {
  key: string;
  label: string;
  /** Path the iframe loads. `null` while we're waiting on data. */
  path: string | null;
  /** Path shown in the mock URL bar — falls back to `path`. */
  display?: string;
  /** Disabled with a hint when the path can't be resolved (e.g. no published news). */
  disabledReason?: string;
}

const DEVICE_WIDTH: Record<Device, number | string> = {
  desktop: "100%",
  tablet: 820,
  mobile: 390,
};

const DEVICE_LABEL: Record<Device, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Smartphone",
};

const DEVICE_GLYPH: Record<Device, string> = {
  desktop: "▭",
  tablet: "▢",
  mobile: "▯",
};

/**
 * The /admin/public preview pane. Renders the live public site inside a
 * scoped iframe so editors can sanity-check what visitors actually see — the
 * same routes, the same data, just with a device-width clamp.
 */
export default function PublicPreviewPage() {
  const [latestSlug, setLatestSlug] = useState<string | null>(null);
  const [latestLoaded, setLatestLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<News[]>("/api/news?status=published")
      .then((items) => {
        if (cancelled) return;
        // Server already sorts by publishAt desc — first published item is latest.
        setLatestSlug(items.length > 0 ? items[0].slug : null);
      })
      .catch(() => {
        // Network/auth errors shouldn't crash the page; we just disable the
        // news tab via `latestSlug === null` once `latestLoaded` flips true.
      })
      .finally(() => {
        if (!cancelled) setLatestLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pages: PageEntry[] = useMemo(
    () => [
      { key: "home", label: "Startseite", path: "/" },
      {
        key: "news",
        label: "Meldung",
        path: latestSlug ? `/news/${latestSlug}` : null,
        display: latestSlug ? `/news/${latestSlug}` : "/news/…",
        disabledReason: latestLoaded
          ? latestSlug
            ? undefined
            : "Keine veröffentlichten Meldungen — sobald eine Meldung live ist, kann sie hier vorgeschaut werden."
          : "Lade neueste Meldung …",
      },
      { key: "training", label: "Training", path: "/training" },
      { key: "schedule", label: "Spielplan", path: "/spiele" },
      { key: "impressum", label: "Impressum", path: "/Impressum" },
      {
        key: "datenschutz",
        label: "Datenschutz",
        path: "/Datenschutzerklaerung",
      },
    ],
    [latestSlug, latestLoaded],
  );

  const [activeKey, setActiveKey] = useState<string>("home");
  const [device, setDevice] = useState<Device>("desktop");

  const active = pages.find((p) => p.key === activeKey) ?? pages[0];
  const activePath = active.path;
  const displayPath = active.display ?? activePath ?? "/";

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Vorschau · Öffentliche Website"
        title="Was Besucher:innen sehen."
        subtitle="Die echte Website in einem Bilderrahmen — alle Änderungen aus News, Sponsoren und Vorstand erscheinen hier sofort. Ideal vor dem nächsten Veröffentlichen."
        right={
          <Button
            kind="primary"
            leading={<Icons.External size={13} />}
            onClick={() => {
              if (activePath) window.open(activePath, "_blank", "noopener");
            }}
            disabled={!activePath}
            aria-disabled={!activePath || undefined}
          >
            In neuem Tab öffnen
          </Button>
        }
      />

      <div className="px-10 pb-14">
        {/* Controls: page tabs + device toggle */}
        <div
          className="rule-b mb-5 flex flex-wrap items-center gap-3 pb-4"
          role="toolbar"
          aria-label="Vorschau-Steuerung"
        >
          <div
            className="flex flex-wrap items-center gap-1"
            role="tablist"
            aria-label="Seite"
          >
            {pages.map((p) => {
              const selected = p.key === activeKey;
              const disabled = p.path === null;
              return (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="public-preview-frame"
                  disabled={disabled}
                  title={p.disabledReason}
                  onClick={() => setActiveKey(p.key)}
                  className="cs-focus h-8 rounded-md px-3 text-[12.5px] font-medium"
                  style={{
                    background: selected ? "var(--primary)" : "transparent",
                    color: selected
                      ? "#fff"
                      : disabled
                        ? "var(--ink-4)"
                        : "var(--ink-2)",
                    boxShadow: selected ? "0 0 12px var(--glow)" : "none",
                    opacity: disabled ? 0.5 : 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          <div
            className="flex items-center gap-0.5 rounded-md p-0.5"
            role="radiogroup"
            aria-label="Gerät"
            style={{
              background: "var(--paper-2)",
              border: "1px solid var(--rule)",
            }}
          >
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
              const active = d === device;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={DEVICE_LABEL[d]}
                  onClick={() => setDevice(d)}
                  className="cs-focus flex h-7 w-9 items-center justify-center rounded-sm text-[14px]"
                  style={{
                    background: active ? "var(--paper-3)" : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-3)",
                  }}
                >
                  {DEVICE_GLYPH[d]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Browser frame */}
        <div
          className="mx-auto"
          style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
          data-testid="preview-frame-wrapper"
          data-device={device}
        >
          <div
            className="flex items-center gap-2 rounded-t-lg px-3 py-2.5"
            style={{
              background: "var(--paper-3)",
              border: "1px solid var(--rule-2)",
              borderBottom: "none",
            }}
          >
            <div className="flex gap-1.5" aria-hidden="true">
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: "#ff5f56" }}
              />
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: "#ffbd2e" }}
              />
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: "#27c93f" }}
              />
            </div>
            <div
              className="flex h-6 flex-1 items-center truncate rounded-md px-3 font-mono text-[11px]"
              style={{
                background: "var(--paper-2)",
                color: "var(--ink-3)",
              }}
              data-testid="preview-url-bar"
            >
              <span style={{ color: "var(--primary)" }}>https://</span>
              {CLUB_DOMAIN}
              {displayPath === "/" ? "" : displayPath}
            </div>
            {activePath && (
              <a
                href={activePath}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="In neuem Tab öffnen"
                className="cs-focus inline-flex h-6 w-6 items-center justify-center rounded-sm"
                style={{ color: "var(--ink-3)" }}
              >
                <Icons.External size={12} />
              </a>
            )}
          </div>

          {activePath ? (
            <iframe
              key={activePath}
              id="public-preview-frame"
              title={`Website-Vorschau: ${active.label}`}
              src={activePath}
              loading="lazy"
              className="block w-full rounded-b-lg bg-white"
              style={{
                height: 720,
                border: "1px solid var(--rule-2)",
                borderTop: "none",
              }}
              data-testid="preview-iframe"
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-b-lg text-[13px]"
              style={{
                height: 720,
                background: "var(--paper-2)",
                border: "1px solid var(--rule-2)",
                borderTop: "none",
                color: "var(--ink-3)",
              }}
              data-testid="preview-empty"
            >
              {active.disabledReason}
            </div>
          )}
        </div>

        <p
          className="mt-3 text-center text-[11.5px]"
          style={{ color: "var(--ink-4)" }}
        >
          Die Vorschau lädt jede Seite neu — Änderungen erscheinen sofort nach
          dem Speichern.
        </p>
      </div>
    </div>
  );
}
