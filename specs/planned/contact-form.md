# Contact form (planned)

> **Status:** not implemented. Today, contact happens exclusively through the hover-reveal phone/email on Vorstand cards or the disposable address linked from the Impressum.

## What a visitor wants

Someone with a question that doesn't cleanly map to a single committee — a sponsorship inquiry, a press request, feedback about the website, a "I want to help but don't know who to call" — needs a catch-all channel. Not everyone is comfortable cold-calling a mobile number, especially first-time visitors.

## The visitor scenario

A local insurance broker wants to discuss sponsoring the club. They open the site, find a `Kontakt` link in the footer, land on a single short form: their name, their email, a topic dropdown, a message, and a privacy consent checkbox. They pick `Sponsoring`, type a paragraph, hit `Nachricht senden`. They see a confirmation message. A day or two later, the right Vorstand member emails them back.

That's the whole flow. The visitor never sees an internal email address — the routing happens out of sight.

## MVP

- A `/kontakt` route, linked from the footer alongside the existing legal links.
- Form fields: name, email, topic (dropdown of a small fixed list — roughly the committee axes from Vorstand plus a general and a press option), message, mandatory privacy consent checkbox linking to the Datenschutzerklärung.
- A backend endpoint that validates input, applies a simple per-IP rate limit, and forwards the message by email to the Vorstand member responsible for that topic. The mapping lives on the server only, so the form cannot be scraped for addresses.
- **Topic → recipient mapping is admin-editable** inside the admin area — the Geschäftsführer maintains it alongside the Vorstand editor, so a chair change after an AGM is one edit, not a deploy. This ties the feature to the admin area landing first; until then, the form cannot ship.
- **AWS SES sends the mail.** The existing AWS stack (per ADR 0002) is the natural MTA; the DSE gains one line naming AWS as a processor for contact-form delivery.
- **Zero server-side retention.** The backend validates, forwards via SES, and never writes the message body to disk or logs. If SES fails, the visitor sees the "try again later" state and the message is gone — no queue, no debug copy, no DSGVO follow-up question about residual data.
- A minimal honeypot field (no CAPTCHA).
- Three visible result states: success (form replaced by a confirmation), validation error (per-field hint), and a generic "please try again later" for backend failures.

That's it. No autosave, no draft persistence, no analytics, no auto-acknowledgment.

### Example: the feedback sender

A fan notices that the website shows the wrong phone number for one of the board members. They use the form with `Feedback zur Website` selected. The message reaches the editorially responsible person, who fixes the phone number on the next deploy.

## Could ship later

In rough order of likely usefulness once the MVP has run for a few months:

1. **Auto-acknowledgment email** to the sender, so they know the message arrived.
2. **Draft persistence in `localStorage`** if real users start losing long messages to accidental refreshes.
3. **An admin inbox view** so messages don't only live in personal mailboxes — depends on the admin area landing first.
4. **Adaptive anti-abuse** (lightweight challenge for repeat-offender IPs) only if spam gets through the honeypot in practice.

Each of these is independently shippable and should only land when an actual problem demonstrates the need.

## Open questions

None gating the MVP. The feature is blocked on the admin area landing first (for the topic→recipient mapping), not on any open design question.

## Architecture

Tracked in `adr/0003-architecture-backlog.md` B8.

## What the contact form does not do

- No file attachments.
- No CAPTCHA in the MVP — honeypot plus rate limit first; revisit only if abuse becomes real.
- No on-site message archive; messages live in the recipient's inbox.
- No multilingual form; the site is German-only.
