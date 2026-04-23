import { Card } from "../../ui";

/**
 * Termine card. The Event entity doesn't exist yet (see Phase 5 in
 * design/IMPLEMENTATION_PLAN.md), so the card surfaces the empty state with
 * the "Bald verfügbar" footnote that matches every other not-yet-built
 * dashboard surface. The chrome is intentionally complete so the card slot
 * is reserved in the layout and there's no visual jolt when Events ship.
 */
export function TermineCard() {
  return (
    <Card padded={false}>
      <div className="rule-b flex items-center justify-between px-5 py-4">
        <div className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>
          Nächste Termine
        </div>
        <span
          className="caps text-[10px]"
          style={{ color: "var(--ink-4)" }}
          aria-label="Coming soon"
        >
          bald
        </span>
      </div>
      <div
        className="px-5 py-8 text-center text-[13px]"
        style={{ color: "var(--ink-3)" }}
      >
        Termine bekommen ein eigenes Modul.
        <br />
        <span style={{ color: "var(--ink-4)" }}>Bald verfügbar.</span>
      </div>
    </Card>
  );
}
