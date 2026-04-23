import { PageHeader } from "../ui";
import { formatLongDate, greetingFor } from "./dashboard/format";

/**
 * Admin dashboard. Phase 2 scaffold — KPI strip, recent news, activity feed,
 * to-do list, and Termine placeholder land in subsequent commits.
 */
export default function DashboardPage() {
  const now = new Date();
  return (
    <div>
      <PageHeader
        eyebrow={`Übersicht · ${formatLongDate(now)}`}
        title={`${greetingFor(now)}.`}
        subtitle="Hier ist, was heute anliegt."
      />
      <div className="px-10 pb-14" data-testid="dashboard-body" />
    </div>
  );
}
