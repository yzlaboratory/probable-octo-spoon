// Fake data for prototype — SV Grün-Weiß Birkenstett (invented, non-branded)

const CLUB = {
  name: "SV Grün-Weiß Birkenstett",
  short: "SVGW Birkenstett",
  founded: 1912,
  domain: "sv-gw-birkenstett.de",
  tagline: "Fußball · Leichtathletik · Tischtennis",
};

const NEWS = [
  { id: 11, slug: "kreisligaderby-2-1", title: "Kreisligaderby: später Siegtreffer gegen FC Waldau", tag: "Fußball", status: "published", publishAt: "2026-04-18", short: "Nach 0:1-Rückstand dreht die Erste die Partie in den Schlussminuten.", author: "M. Keller", views: 412 },
  { id: 10, slug: "junioren-f-turnier", title: "F-Junioren-Turnier: über 80 Kinder in der Halle", tag: "Jugend", status: "published", publishAt: "2026-04-14", short: "Osterturnier mit acht Mannschaften und viel Kuchen.", author: "S. Vogt", views: 288 },
  { id: 9, slug: "jhv-2026", title: "Einladung zur Jahreshauptversammlung am 3. Mai", tag: "Verein", status: "scheduled", publishAt: "2026-04-25", short: "Tagesordnung, Kassenbericht, Wahl des neuen Kassenwarts.", author: "Vorstand", views: 0 },
  { id: 8, slug: "sommerfest-ankuendigung", title: "Sommerfest 2026 – Save the Date", tag: "Verein", status: "draft", publishAt: null, short: "27.–29. Juni, Festplatz am Sportheim.", author: "R. Hahn", views: 0 },
  { id: 7, slug: "leichtathletik-bezirk", title: "Bezirksmeisterschaften: vier Medaillen für die LG", tag: "Leichtathletik", status: "published", publishAt: "2026-04-07", short: "Gold über 800 m für Hanna Wiegert.", author: "T. Brandt", views: 521 },
  { id: 6, slug: "neue-trikots-herren", title: "Neue Trikotsätze für die Herrenmannschaften", tag: "Sponsoring", status: "published", publishAt: "2026-03-29", short: "Dank an Bäckerei Aufenanger und Autohaus Leitl.", author: "M. Keller", views: 194 },
  { id: 5, slug: "trainingszeiten-fruehjahr", title: "Trainingszeiten Frühjahr 2026", tag: "Verein", status: "published", publishAt: "2026-03-10", short: "Alle Mannschaften, alle Tage, alle Plätze.", author: "Geschäftsstelle", views: 1203 },
  { id: 4, slug: "niederlage-pokal", title: "Pokal-Aus nach Elfmeterschießen", tag: "Fußball", status: "withdrawn", publishAt: "2026-03-01", short: "Bitter: 4:5 nach 1:1 in Regenspurt.", author: "M. Keller", views: 341 },
];

const SPONSORS = [
  { id: 1, name: "Raiffeisenbank Birkenstett", tier: "Hauptsponsor", weight: 10, status: "active", palette: "warm-neutral", url: "raiba-birkenstett.de", since: "2019" },
  { id: 2, name: "Autohaus Leitl GmbH", tier: "Premium", weight: 7, status: "active", palette: "cool-neutral", url: "autohaus-leitl.de", since: "2021" },
  { id: 3, name: "Bäckerei Aufenanger", tier: "Premium", weight: 6, status: "active", palette: "warm-neutral", url: "baeckerei-aufenanger.de", since: "2014" },
  { id: 4, name: "Elektro Brunner", tier: "Standard", weight: 4, status: "active", palette: "cool-neutral", url: "elektro-brunner.de", since: "2020" },
  { id: 5, name: "Getränke Stummer", tier: "Standard", weight: 4, status: "active", palette: "transparent", url: "getraenke-stummer.de", since: "2017" },
  { id: 6, name: "Metzgerei Hollweck", tier: "Standard", weight: 3, status: "active", palette: "warm-neutral", url: "metzgerei-hollweck.de", since: "2015" },
  { id: 7, name: "Zimmerei Brandmeier", tier: "Standard", weight: 3, status: "active", palette: "transparent", url: "brandmeier-holz.de", since: "2022" },
  { id: 8, name: "Physio Wiegert", tier: "Partner", weight: 2, status: "active", palette: "cool-neutral", url: "physio-wiegert.de", since: "2023" },
  { id: 9, name: "Reifen Stiegler", tier: "Partner", weight: 2, status: "paused", palette: "transparent", url: "reifen-stiegler.de", since: "2018" },
  { id: 10, name: "Gasthof Zum Hirschen", tier: "Partner", weight: 1, status: "active", palette: "warm-neutral", url: "hirschen-birkenstett.de", since: "2012" },
];

const VORSTAND = [
  { id: 1, name: "Rudolf Hahn", role: "1. Vorsitzender", email: "r.hahn@svgw.de", phone: "0851 / 123 456", status: "active", initials: "RH", color: "oklch(0.62 0.22 290)" },
  { id: 2, name: "Claudia Vogt-Brenner", role: "2. Vorsitzende", email: "c.vogt@svgw.de", phone: "0851 / 123 457", status: "active", initials: "CV", color: "oklch(0.72 0.19 25)" },
  { id: 3, name: "Michael Keller", role: "Schriftführer & Pressewart", email: "m.keller@svgw.de", phone: null, status: "active", initials: "MK", color: "oklch(0.58 0.22 330)" },
  { id: 4, name: "Sabine Leitl", role: "Kassenwartin", email: "kasse@svgw.de", phone: "0851 / 123 458", status: "active", initials: "SL", color: "oklch(0.78 0.16 85)" },
  { id: 5, name: "Thomas Brandt", role: "Leiter Leichtathletik", email: "la@svgw.de", phone: null, status: "active", initials: "TB", color: "oklch(0.68 0.18 160)" },
  { id: 6, name: "Sandra Vogt", role: "Jugendleiterin", email: "jugend@svgw.de", phone: "0851 / 123 459", status: "active", initials: "SV", color: "oklch(0.68 0.18 250)" },
  { id: 7, name: "Peter Dorfmüller", role: "Platzwart", email: null, phone: "0851 / 123 460", status: "active", initials: "PD", color: "oklch(0.55 0.15 30)" },
  { id: 8, name: "Andrea Stiegler", role: "Ehrenmitglied", email: null, phone: null, status: "hidden", initials: "AS", color: "oklch(0.5 0.02 280)" },
];

const ACTIVITY = [
  { t: "vor 4 Min.",  who: "Michael K.", what: "hat die Meldung „Kreisligaderby: später Siegtreffer’ veröffentlicht.", kind: "news" },
  { t: "vor 1 Std.",  who: "Sabine L.",  what: "hat 2 Sponsorenlogos hochgeladen.", kind: "media" },
  { t: "vor 3 Std.",  who: "Sandra V.",  what: "hat die Meldung „F-Junioren-Turnier’ geplant für 14.04., 18:00.", kind: "news" },
  { t: "gestern",     who: "Rudolf H.",  what: "hat das Portrait von Thomas Brandt aktualisiert.", kind: "vorstand" },
  { t: "gestern",     who: "System",     what: "hat 3 abgelaufene Sponsorenverträge archiviert.", kind: "system" },
  { t: "vor 2 Tagen", who: "Michael K.", what: "hat einen neuen Entwurf „Sommerfest 2026’ angelegt.", kind: "news" },
];

window.CLUB = CLUB;
window.NEWS_DATA = NEWS;
window.SPONSORS_DATA = SPONSORS;
window.VORSTAND_DATA = VORSTAND;
window.ACTIVITY = ACTIVITY;
