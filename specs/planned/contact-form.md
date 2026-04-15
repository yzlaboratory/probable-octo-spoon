# Contact form (planned)

> **Status:** not implemented. Today, contact happens exclusively through the hover-reveal phone/email on Vorstand cards or the footer Impressum email (`throwaway.relock977@passinbox.com`).

## What a visitor wants

Someone with a question that doesn't cleanly map to a committee — a sponsorship inquiry, a feedback note about the website, a press request, a "hey I'd like to help but don't know who to call" — needs a catch-all channel. Not everyone is comfortable cold-calling a mobile number.

## Where it lives

A new route `/kontakt` with its own top-level mention at the bottom of every page (added to the footer nav row: `Startseite | Instagram | Impressum | Datenschutzerklärung | Kontakt`). No header entry.

## The form

A single column, center-aligned on desktop, full-bleed on mobile:

- **Name** — text input, required.
- **E-Mail** — email input, required, client-side format validation (`<input type="email">`).
- **Betreff / Concern** — select dropdown with options: Allgemein, Sponsoring, Jugend, Training, Presse, Feedback zur Website, Sonstiges. Defaults to "Allgemein."
- **Nachricht** — multi-line textarea, required, minimum 20 characters client-side.
- **Datenschutz-Checkbox** — "Ich habe die [Datenschutzerklärung](/Datenschutzerklaerung) gelesen und bin mit der Verarbeitung meiner Angaben einverstanden." Required. Link opens the privacy page in the same tab; pressing back returns with form state preserved.
- **Submit button** — labeled `Nachricht senden`, primary-color background, full-width on mobile.

All inputs use the existing dark-mode style system (transparent background, thin primary-color bottom border on focus, white text).

### Example: the sponsor inquiry

A local insurance broker wants to sponsor the club. They don't know who handles sponsorship. They open `/kontakt`, pick `Sponsoring` from the dropdown, type a paragraph, submit. The message routes to the appropriate committee member automatically.

### Example: the feedback sender

A fan notices that the website shows the wrong phone number for one of the board members. They use the contact form with `Feedback zur Website` — which routes to Yannik Zeyer (redaktionell verantwortlich per Impressum).

## Routing logic

Each `Betreff` value maps to a board email on the backend:

| Betreff | Routes to |
|---|---|
| Allgemein | Geschäftsführer (Matthias Heinrich) |
| Sponsoring | Präsident (Björn Perius) |
| Jugend | Jugendausschuss (Pascal Herre) |
| Training | Spielausschuss (Mathias Zöhler) |
| Presse | Geschäftsführer |
| Feedback zur Website | Yannik Zeyer |
| Sonstiges | Geschäftsführer |

The mapping is server-side only — the dropdown on the client never exposes an email address, so the form does not become a spam harvester.

## Backend

A new Express route `POST /api/contact`:

1. Validates payload (name, email format, non-empty message, privacy consent = true). Returns 400 on failure with a field-level error object.
2. Honeypot field `website` must be empty — if filled, the request is silently accepted (returns 200) but not forwarded. Eliminates the simplest bots without CAPTCHA friction.
3. Rate-limits by IP: max 3 messages per 10 minutes.
4. Sends via SES (consistent with the existing AWS stack) with `Reply-To` set to the visitor's email, `To` the mapped recipient, `Bcc` the webmaster for auditing. Subject line: `[svthalexweiler.de] {Betreff} — {Name}`.
5. Returns 200 with `{ ok: true }`.

## Success/failure states

- **Loading** — submit button becomes a spinner, inputs disabled.
- **Success** — form replaced by a centered confirmation: *"Danke! Deine Nachricht ist unterwegs. Wir melden uns innerhalb weniger Tage."*
- **Validation error** — per-field red hint below the input, no top-level alert.
- **Network/server error** — generic card: *"Das hat nicht geklappt. Bitte versuche es später noch einmal oder schreibe direkt an [email]."*

## Accessibility

Every input has an associated `<label>`. The submit button has `aria-busy` during request. On success, focus moves to the confirmation so screen readers announce it.

## Cross-cutting polish

- **Email deliverability** — SPF, DKIM, and DMARC records on `svthalexweiler.de`; SES is the sending MTA. Monthly DMARC aggregate reports reviewed by the infrastructure owner.
- **Auto-acknowledgment email** — the sender immediately receives a brief confirmation ("Deine Nachricht ist bei uns eingegangen. Wir melden uns innerhalb weniger Tage.") with `Reply-To` set to the routed recipient for seamless threading.
- **Draft persistence** — every form-state change is mirrored to `localStorage` (debounced 500 ms) so a mistaken refresh or crashed tab doesn't lose a long message. On return, a banner offers `Entwurf wiederherstellen`.
- **Structured data** — Schema.org `ContactPage` and `Organization.contactPoint` for SEO.
- **Accessibility** — labels bound to inputs; error messages announced via `aria-live="polite"`; submit button toggles `aria-busy`; on success, focus moves to the confirmation so screen readers announce it.
- **Adaptive anti-abuse** — clean first submissions pass; flagged IPs (3+ submissions in 24 h) see a lightweight challenge (simple math) before the honeypot fails are silently dropped. No reCAPTCHA — no third-party embed, no tracking cookie.
- **Data retention policy** — contact messages are retained in inboxes per German record-keeping norms (6 years for business correspondence); server-side logs of `/api/contact` are deleted after 30 days.
- **Analytics** — form open, validation fail, successful submit counted cookielessly. Conversion rate (open → submit) exposed in the admin dashboard.

## What it does not do

- No file attachments.
- No CAPTCHA (honeypot + rate limit instead). Revisit if spam becomes a real problem.
- No message archive — messages live only in the recipient's inbox.
- No auto-reply to the sender.
