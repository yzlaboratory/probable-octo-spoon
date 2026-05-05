// Auto-fixture that hooks Chromium's CDP coverage API and feeds it into
// monocart-reporter via addCoverageReport(). One per-test entry → merge
// orchestrator pulls the raw V8 dumps from coverage/raw/playwright/.

import { test as base, expect } from "@playwright/test";
// @ts-expect-error - monocart-reporter ships untyped runtime helpers
import { addCoverageReport } from "monocart-reporter";

const test = base.extend({
  autoCoverage: [
    async ({ page, browserName }, use) => {
      const isChromium = browserName === "chromium";
      if (isChromium) {
        await Promise.all([
          page.coverage.startJSCoverage({ resetOnNavigation: false }),
          page.coverage.startCSSCoverage({ resetOnNavigation: false }),
        ]);
      }

      await use("autoCoverage");

      if (isChromium) {
        const [jsCoverage, cssCoverage] = await Promise.all([
          page.coverage.stopJSCoverage(),
          page.coverage.stopCSSCoverage(),
        ]);
        // Skip CSS — Tailwind output isn't actionable in the unified
        // signal, and CSS entries bypass Monocart's entryFilter.
        void cssCoverage;
        const coverageList = [...jsCoverage];
        await addCoverageReport(coverageList, test.info());
      }
    },
    { scope: "test", auto: true },
  ],
});

export { test, expect };
