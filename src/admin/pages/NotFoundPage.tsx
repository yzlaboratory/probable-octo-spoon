import { Link, useLocation } from "react-router-dom";
import { Button, Card, PageHeader } from "../ui";
import * as Icons from "../ui/Icons";

/**
 * Catch-all for unknown `/admin/*` paths. Sits inside AdminLayout so the
 * sidebar/topbar still render — a stale bookmark or a typo lands on a
 * friendly screen rather than a blank body.
 */
export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <div>
      <PageHeader
        eyebrow="404 · Nicht gefunden"
        title="Diese Seite gibt es hier nicht."
        subtitle={
          <>
            Vielleicht ein veralteter Link oder ein Tippfehler. Die Übersicht
            führt dich zurück.
          </>
        }
        right={
          <Link to="/admin">
            <Button kind="primary" leading={<Icons.Arrow size={13} />}>
              Zur Übersicht
            </Button>
          </Link>
        }
      />

      <div className="px-10 pb-14">
        <Card>
          <div
            className="caps mb-1 text-[10.5px]"
            style={{ color: "var(--ink-3)" }}
          >
            Angefragter Pfad
          </div>
          <code
            data-testid="not-found-path"
            className="font-mono text-[13px] break-all"
            style={{ color: "var(--ink-2)" }}
          >
            {pathname}
          </code>
        </Card>
      </div>
    </div>
  );
}
