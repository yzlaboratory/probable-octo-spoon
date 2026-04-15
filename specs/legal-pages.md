# Legal pages (Impressum, Datenschutzerklärung)

German law (§5 TMG and the DSGVO) requires every commercial or public-facing German website to carry an Impressum and a Datenschutzerklärung. The club is a Verein, so both are non-optional. The site treats them as static, low-traffic pages reachable only from the footer.

## Finding the pages

Both pages are linked exclusively from the Footer — one row at the bottom of every page has `Startseite | Instagram | Impressum | Datenschutzerklärung`. There is no header nav entry. The expectation is that regulators and the occasional curious visitor click through, not that ordinary users see these pages during normal browsing.

## Impressum (`/Impressum`)

A single-column white-on-dark page with three headings rendered at display sizes (3xl on mobile, 7xl on desktop):

- **IMPRESSUM** — Yannik Zeyer, Zum Eisresch 36a, 66822 Lebach.
- **KONTAKT** — phone `0151 2222 8048`, email `throwaway.relock977@passinbox.com`.
- **REDAKTIONELL VERANTWORTLICH** — Yannik Zeyer.

The contact email is a disposable/alias address (`throwaway.relock977@passinbox.com`), which suggests the site owner does not want to publish their primary address on a scrapeable public page — a pragmatic choice for fighting spam while still satisfying the legal disclosure duty.

### Example: the compliance checker

A regional trade-office inspector confirms the club site carries a complete Impressum and notes the name, street address, phone, and email of the responsible person.

### Example: the curious user with a complaint

A visitor spots a typo on a news article, reaches the Impressum via the footer, and emails the disposable address.

## Datenschutzerklärung (`/Datenschutzerklaerung`)

A long-form privacy policy page. The body is stored as a single pre-rendered HTML string in `DatenschutzPage.tsx` and is injected into the DOM as-is. Headings cascade from display size (h1) down through h2/h3-like weights styled via inline Tailwind classes. Topics covered include:

- "Datenschutz auf einen Blick" overview.
- Identification of the data controller.
- What data is collected, and how.
- Visitor rights (access, correction, deletion, portability, objection).
- Cookies, server log files, hosting, SSL/TLS encryption notice.
- Third-party services referenced by the site (Instagram embed is the relevant one).

The page is entirely static — no form, no consent banner, no analytics opt-out.

## Routing quirk

The routes use the capitalized German spelling exactly: `/Impressum` and `/Datenschutzerklaerung` (note the Ae transliteration, no ä in URLs). A visitor typing `/impressum` in lowercase will hit the react-router SPA fallback, not match the route, and see the empty Layout shell. The Footer links use the correct capitalization so this only affects users who type the URL by hand.

## What the legal pages do not do

- No cookie consent dialog. The site doesn't set analytics cookies, so it relies on the "technische Notwendigkeit" exemption.
- No GDPR data-request form — requests go through the Impressum email.
- No multilingual version; both pages are German-only.
- No versioning or "last updated" date shown to the visitor.
