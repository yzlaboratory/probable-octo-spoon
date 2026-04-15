# Contact form (planned)

> **Status:** not implemented. Today, contact happens exclusively through the hover-reveal phone/email on Vorstand cards or the disposable address linked from the Impressum.

## What a visitor wants

Someone with a question that doesn't cleanly map to a single committee — a sponsorship inquiry, a press request, feedback about the website, a "I want to help but don't know who to call" — needs a catch-all channel. Not everyone is comfortable cold-calling a mobile number, especially first-time visitors.

## The visitor scenario

A local insurance broker wants to discuss sponsoring the club. They open the site, find a `Kontakt` link in the footer, land on a single short form: their name, their email, a topic dropdown, a message, and a privacy consent checkbox. They pick `Sponsoring`, type a paragraph, hit `Nachricht senden`. They see a confirmation message. A day or two later, the right Vorstand member emails them back.

That's the whole flow. The visitor never sees an internal email address — the routing happens out of sight.

## MVP

- A `/kontakt` route, linked from the footer alongside the existing legal links.
- Form fields: name, email, topic (dropdown of a small fixed list — Allgemein, Sponsoring, Jugend, Training, Presse, Feedback zur Website, Sonstiges), message, mandatory privacy consent checkbox linking to the Datenschutzerklärung.
- A backend endpoint that validates input, applies a simple per-IP rate limit, and forwards the message by email to the Vorstand member responsible for that topic. The mapping lives on the server only, so the form cannot be scraped for addresses.
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

- Where does the topic-to-recipient mapping live operationally? In code (changes need a deploy) or in a small config table the Vorstand can edit (depends on the admin area)?
- Is SES the right MTA, or does the existing Impressum-alias provider already cover this?
- What's the right retention policy for messages on the server side, given that the inbox copy is the canonical record?

## Architecture

Endpoint shape, validation rules, rate-limit numbers, mail-server choice, SPF/DKIM/DMARC posture, log retention, and accessibility implementation details belong in an ADR. They are not visitor-facing scenarios.

## What the contact form does not do

- No file attachments.
- No CAPTCHA in the MVP — honeypot plus rate limit first; revisit only if abuse becomes real.
- No on-site message archive; messages live in the recipient's inbox.
- No multilingual form; the site is German-only.
