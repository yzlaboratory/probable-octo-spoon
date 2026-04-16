# Cart / merchandise and dues (planned)

> **Status:** placeholder. The disabled cart affordance in the header anticipates this feature; the details have not yet been worked through. This file exists so the header's dangling promise points at a real roadmap entry, not at nothing.

## What a visitor wants

Two distinct audiences converge on the same mental model ("the club has a cart"):

- **A supporter** who wants a scarf, a jersey, a Kirmes-Tassen mug, or a fan item — pays once, receives a physical item.
- **A member** who wants to pay or renew their membership dues without a paper Überweisungsformular or a SEPA mandate trip to the clubhouse.

Both use the same cart-shaped affordance; the items in that cart are either physical goods or membership fees, and the checkout experience is broadly similar.

## The visitor scenario

A supporter opens the site, clicks the header cart, browses a small catalogue of items (scarf, youth-team shirt, Kirmes mug, AH jersey reprint). They add two items, enter their address, pay by card or SEPA, and see an order confirmation. A few days later a board member hands them the package or posts it.

A member opens the site, goes to the cart, picks "Mitgliedsbeitrag 2026," picks the right tier (Erwachsene / Jugend / Familie / passiv), pays, and gets a receipt email. The Schatzmeister's ledger reflects the payment the same day.

These are two related but different flows. The MVP picks *one* to ship first, or a deliberate subset of both.

## MVP

Deliberately under-specified until the club decides scope — the choices below gate the real MVP spec:

- Scope: merch only, dues only, or both at once?
- Catalogue size for the MVP: a handful of items, or everything the club sells?
- Fulfilment: pickup at the clubhouse, post, or both?
- Payment rails: Stripe, Mollie, or direct SEPA?
- Inventory: tracked, or "we'll email you if it's sold out"?

Once those are answered, the MVP is a short spec — a catalogue page, a cart, a checkout, an admin view for the Schatzmeister. None of that is drafted here because premature detail will just be deleted when the scope decisions land.

## Could ship later

Not stack-ranked — these are candidates to consider *after* the scope decisions:

- Member-only pricing (requires admin-auth membership linkage).
- Sponsor-branded discount codes.
- Match-day pop-up catalogue (e.g. home games only).
- Recurring membership subscriptions instead of annual one-off.
- Gift cards.
- Wishlists.
- Integration with an accounting export for the Schatzmeister.

## Open questions

The entire first pass of scoping decisions, starting with:

- **Merch, dues, or both in the MVP?** They share a cart but have different compliance footprints (VAT on goods; DSGVO + membership agreement on dues).
- **Payment provider?** Stripe and Mollie are both common German-market choices; SEPA direct debit is cheapest but needs a mandate flow.
- **Who fulfils orders?** Is there a volunteer willing to pack and ship, or is this strictly clubhouse-pickup?
- **VAT and Kleinunternehmerregelung** — does the Verein cross the threshold? If yes, every item needs VAT handling; if no, the checkout is simpler but needs a disclosure.
- **Refund and return policy** for physical items — required under German distance-selling law (Widerrufsrecht).
- **How does a membership payment affect the member record?** Is there a membership registry at all, or does the Schatzmeister reconcile by name?

## Architecture

Not yet tracked in `adr/0003-architecture-backlog.md` — this feature is far enough out that adding an entry now would be premature. A backlog entry gets written once the scope decisions above are settled.

## What it does not do (for now)

- No raffle or lottery flows (German gambling law is its own track).
- No ticketing (amateur football is free admission).
- No peer-to-peer resale between members.
- No fan-club loyalty programme.
