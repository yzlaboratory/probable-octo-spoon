-- Admin-editable training schedule (replaces hardcoded src/data/training.ts).
-- Per ADR/spec at specs/planned/training-times.md: "An admin-editable data
-- source, so a coaching change does not require a deploy."
--
-- No display_order on training_slots: slots within a day always sort by
-- (day, time_from). Manual ordering would have no real use case here.

CREATE TABLE training_slots (
  id          INTEGER PRIMARY KEY,
  group_name  TEXT    NOT NULL,
  day         TEXT    NOT NULL CHECK (day IN (
                'Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'
              )),
  time_from   TEXT    NOT NULL,
  time_to     TEXT    NOT NULL,
  trainer     TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  visibility  TEXT    NOT NULL CHECK (visibility IN (
                'offen für Gäste','Anmeldung erforderlich','nur Mitglieder'
              )),
  status      TEXT    NOT NULL CHECK (status IN ('active','hidden','archived')),
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);
CREATE INDEX training_slots_status_day_time_idx
  ON training_slots(status, day, time_from);

-- Single-row settings table for the seasonal banner ("Sommerpause bis …").
-- The CHECK on id pins it to one row; banner_message NULL = banner hidden.
CREATE TABLE training_settings (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  banner_message  TEXT,
  updated_at      TEXT NOT NULL
);
INSERT INTO training_settings (id, banner_message, updated_at)
  VALUES (1, NULL, '1970-01-01T00:00:00.000Z');

-- Seed from the previously hardcoded src/data/training.ts so a fresh DB
-- ships with the same content the public site has been showing.
INSERT INTO training_slots
  (group_name, day, time_from, time_to, trainer, phone, visibility, status, created_at, updated_at)
VALUES
  ('Bambini (U7)',     'Dienstag',   '17:00','18:00','N.N.','0151 0000 0000','offen für Gäste',          'active','1970-01-01T00:00:00.000Z','1970-01-01T00:00:00.000Z'),
  ('F-Jugend (U9)',    'Mittwoch',   '17:00','18:30','N.N.','0151 0000 0000','Anmeldung erforderlich',   'active','1970-01-01T00:00:00.000Z','1970-01-01T00:00:00.000Z'),
  ('Herrenmannschaft', 'Dienstag',   '19:00','20:30','N.N.','0151 0000 0000','nur Mitglieder',           'active','1970-01-01T00:00:00.000Z','1970-01-01T00:00:00.000Z'),
  ('Herrenmannschaft', 'Donnerstag', '19:00','20:30','N.N.','0151 0000 0000','nur Mitglieder',           'active','1970-01-01T00:00:00.000Z','1970-01-01T00:00:00.000Z'),
  ('Alte Herren',      'Freitag',    '19:30','21:00','N.N.','0151 0000 0000','offen für Gäste',          'active','1970-01-01T00:00:00.000Z','1970-01-01T00:00:00.000Z');
