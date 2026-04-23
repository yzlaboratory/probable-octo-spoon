// Additional data for Events, Members, Media, and public website

const EVENTS = [
  { id: 1, date: "2026-04-25", time: "19:30", dur: 120, title: "Jahreshauptversammlung", location: "Vereinsheim · Saal", kind: "verein", status: "published", attendees: 64, capacity: 120, lead: "M. Keller", desc: "Tagesordnung, Kassenbericht, Wahl des Kassenwarts." },
  { id: 2, date: "2026-04-26", time: "10:00", dur: 90, title: "F-Jugend Training", location: "Platz 2", kind: "training", status: "published", attendees: 18, capacity: 24, lead: "S. Vogt", desc: "Wöchentliches Training der F-Jugend." },
  { id: 3, date: "2026-04-26", time: "15:00", dur: 105, title: "Heimspiel · Erste gegen FC Waldau", location: "Hauptplatz", kind: "spiel", status: "published", attendees: 220, capacity: 500, lead: "Geschäftsstelle", desc: "Kreisliga A, Rückrunde · Spieltag 22." },
  { id: 4, date: "2026-04-28", time: "18:00", dur: 90, title: "Herren-Training", location: "Hauptplatz", kind: "training", status: "published", attendees: 22, capacity: 30, lead: "R. Hahn", desc: "Taktiktraining, Vorbereitung FC Eibenried." },
  { id: 5, date: "2026-05-02", time: "14:00", dur: 180, title: "Bezirksmeisterschaft Leichtathletik", location: "Stadion Regensburg", kind: "spiel", status: "published", attendees: 0, capacity: 0, lead: "T. Brandt", desc: "Auswärtswettkampf — Anreise 11:30 Sportheim." },
  { id: 6, date: "2026-05-03", time: "15:00", dur: 105, title: "Auswärts · FC Eibenried", location: "Sportpark Eibenried", kind: "spiel", status: "published", attendees: 0, capacity: 0, lead: "Geschäftsstelle", desc: "Kreisliga A, Spieltag 23." },
  { id: 7, date: "2026-05-08", time: "19:00", dur: 120, title: "Schulung: Erste Hilfe", location: "Vereinsheim · Saal", kind: "verein", status: "scheduled", attendees: 12, capacity: 20, lead: "C. Vogt-Brenner", desc: "Pflichtschulung für Trainer und Betreuer." },
  { id: 8, date: "2026-05-10", time: "11:00", dur: 360, title: "Tag der offenen Tür", location: "Sportgelände", kind: "verein", status: "draft", attendees: 0, capacity: 0, lead: "Vorstand", desc: "Schnuppertraining, Grillen, Vereinsrallye." },
  { id: 9, date: "2026-06-27", time: "17:00", dur: 1440, title: "Sommerfest 2026", location: "Festplatz", kind: "verein", status: "draft", attendees: 0, capacity: 800, lead: "R. Hahn", desc: "Dreitägiges Vereinsfest mit Bühne und Turnier." },
];

const MEMBERS = [
  { id: 1, name: "Anna Aufenanger", mnum: "B-1947", section: "Fußball · Damen", since: "2012-09", dues: "paid", email: "a.aufenanger@example.de", status: "active", age: 28, initials: "AA", hue: 25 },
  { id: 2, name: "Bernhard Brunner", mnum: "B-0412", section: "Fußball · Herren", since: "2001-03", dues: "paid", email: "b.brunner@example.de", status: "active", age: 41, initials: "BB", hue: 290 },
  { id: 3, name: "Clara Dorfmüller", mnum: "B-2103", section: "Leichtathletik", since: "2019-01", dues: "overdue", email: "c.dorfmueller@example.de", status: "active", age: 17, initials: "CD", hue: 85 },
  { id: 4, name: "David Eichhorn", mnum: "B-2244", section: "Jugend · D", since: "2021-08", dues: "paid", email: null, status: "active", age: 13, initials: "DE", hue: 330 },
  { id: 5, name: "Eva Fleischmann", mnum: "B-1205", section: "Fußball · Damen", since: "2014-02", dues: "paid", email: "e.fleischmann@example.de", status: "active", age: 31, initials: "EF", hue: 160 },
  { id: 6, name: "Florian Gebhart", mnum: "B-2411", section: "Tischtennis", since: "2022-11", dues: "pending", email: "f.gebhart@example.de", status: "active", age: 24, initials: "FG", hue: 250 },
  { id: 7, name: "Greta Hanselmann", mnum: "B-1882", section: "Passiv", since: "2018-06", dues: "paid", email: "g.hanselmann@example.de", status: "passive", age: 58, initials: "GH", hue: 45 },
  { id: 8, name: "Heinrich Inninger", mnum: "B-0089", section: "Ehrenmitglied", since: "1974-04", dues: "exempt", email: null, status: "honor", age: 81, initials: "HI", hue: 15 },
  { id: 9, name: "Iris Jäger", mnum: "B-2499", section: "Leichtathletik", since: "2023-02", dues: "paid", email: "i.jaeger@example.de", status: "active", age: 22, initials: "IJ", hue: 200 },
  { id: 10, name: "Jonas Kellner", mnum: "B-2510", section: "Jugend · C", since: "2023-09", dues: "overdue", email: null, status: "active", age: 14, initials: "JK", hue: 310 },
  { id: 11, name: "Katharina Lutz", mnum: "B-1650", section: "Fußball · Damen", since: "2016-08", dues: "paid", email: "k.lutz@example.de", status: "active", age: 27, initials: "KL", hue: 60 },
  { id: 12, name: "Lukas Maierhofer", mnum: "B-2358", section: "Herren II", since: "2022-07", dues: "paid", email: "l.maierhofer@example.de", status: "active", age: 20, initials: "LM", hue: 130 },
];

const MEDIA = [
  { id: 1, name: "derby-tor-minute-89.jpg", kind: "image", size: "2.4 MB", dims: "3000×2000", tags: ["Spielbericht", "Fußball"], uploader: "MK", at: "vor 4 Std." },
  { id: 2, name: "f-jugend-turnier-gruppe.jpg", kind: "image", size: "1.8 MB", dims: "2400×1600", tags: ["Jugend", "Turnier"], uploader: "SV", at: "vor 3 Tagen" },
  { id: 3, name: "hanna-wiegert-gold-800m.jpg", kind: "image", size: "3.1 MB", dims: "3600×2400", tags: ["Leichtathletik"], uploader: "TB", at: "letzte Woche" },
  { id: 4, name: "sponsorenwand-2026.jpg", kind: "image", size: "4.2 MB", dims: "4000×2400", tags: ["Sponsoren"], uploader: "SL", at: "letzte Woche" },
  { id: 5, name: "vereinswappen.svg", kind: "vector", size: "14 KB", dims: "SVG", tags: ["Brand"], uploader: "MK", at: "vor 1 Mon." },
  { id: 6, name: "luftaufnahme-sportgelaende.jpg", kind: "image", size: "5.8 MB", dims: "5000×3200", tags: ["Gelände"], uploader: "RH", at: "vor 2 Mon." },
  { id: 7, name: "jhv-2026-protokoll.pdf", kind: "document", size: "340 KB", dims: "PDF · 12 S.", tags: ["Verein", "Protokoll"], uploader: "MK", at: "vor 1 Std." },
  { id: 8, name: "bezirk-medaillen.jpg", kind: "image", size: "2.2 MB", dims: "2800×1800", tags: ["Leichtathletik"], uploader: "TB", at: "vor 2 Wo." },
  { id: 9, name: "heimtrikot-2026.jpg", kind: "image", size: "1.5 MB", dims: "2000×2500", tags: ["Sponsoring"], uploader: "MK", at: "vor 3 Wo." },
  { id: 10, name: "trainingsplan-fruehjahr.pdf", kind: "document", size: "180 KB", dims: "PDF · 4 S.", tags: ["Verein"], uploader: "Geschäftsstelle", at: "vor 5 Wo." },
  { id: 11, name: "herren-mannschaftsfoto-2025.jpg", kind: "image", size: "4.0 MB", dims: "3600×2400", tags: ["Fußball"], uploader: "MK", at: "vor 6 Mon." },
  { id: 12, name: "festplatz-aufbau.jpg", kind: "image", size: "2.9 MB", dims: "3200×2000", tags: ["Sommerfest"], uploader: "PD", at: "vor 1 Wo." },
];

// Default block-based news draft
const ARTICLE_BLOCKS = [
  { id: "b1", kind: "heading", level: 1, text: "Kreisligaderby: später Siegtreffer gegen FC Waldau" },
  { id: "b2", kind: "lead", text: "Nach 0:1-Rückstand in der 74. Minute zeigt die Erste Moral — ein Doppelschlag in den Schlussminuten dreht die Partie vor 412 Zuschauern am Sportplatz Birkenstett." },
  { id: "b3", kind: "image", caption: "Der Ausgleich in der 89. Minute — Jubel auf der Tribüne.", credit: "Foto: M. Keller" },
  { id: "b4", kind: "paragraph", text: "Es war eines jener Spiele, die man in Birkenstett lange nicht vergessen wird. Die Erste geriet früh unter Druck, konnte aber durch eine konzentrierte Defensivarbeit in der ersten Halbzeit ein schnelleres Gegentor verhindern. Nach dem Seitenwechsel drückte Waldau mehr aufs Tempo — das 0:1 in der 74. Minute fiel fast folgerichtig." },
  { id: "b5", kind: "heading", level: 2, text: "Die Wende in den Schlussminuten" },
  { id: "b6", kind: "paragraph", text: "Trainer Hahn brachte in der 80. Minute Simon Brandmeier für den angeschlagenen Lukas Maierhofer. Genau dieser Wechsel sollte das Spiel drehen: Brandmeier leitete in der 87. Minute den Ausgleich ein, den Anna Aufenanger per Kopf versenkte." },
  { id: "b7", kind: "quote", text: "Wir haben bis zur letzten Sekunde an uns geglaubt. Das war heute keine Frage der Taktik, sondern des Charakters.", attr: "Rudolf Hahn, Trainer" },
  { id: "b8", kind: "paragraph", text: "Zwei Minuten später war es dann Bernhard Brunner, der nach einem Freistoß aus 23 Metern die Partie endgültig drehte. 2:1 — ein Sieg, der im Abstiegskampf doppelt wichtig ist." },
  { id: "b9", kind: "stats", rows: [
    { l: "Ballbesitz", a: 46, b: 54 },
    { l: "Schüsse aufs Tor", a: 7, b: 11 },
    { l: "Ecken", a: 4, b: 6 },
    { l: "Zweikämpfe", a: 52, b: 48 },
  ] },
  { id: "b10", kind: "callout", tone: "forest", text: "Nächstes Heimspiel: Sonntag, 3. Mai, 15:00 Uhr gegen FC Eibenried." },
];

window.EVENTS_DATA = EVENTS;
window.MEMBERS_DATA = MEMBERS;
window.MEDIA_DATA = MEDIA;
window.ARTICLE_BLOCKS = ARTICLE_BLOCKS;
