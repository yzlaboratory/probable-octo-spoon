-- Initial schema for the admin MVP.
-- Per ADR 0007 (SQLite), ADR 0009 (admins/sessions), ADR 0010 (news/media),
-- ADR 0011 (sponsors), ADR 0012 (vorstand).

CREATE TABLE admins (
  id              INTEGER PRIMARY KEY,
  email           TEXT    NOT NULL UNIQUE,
  password_hash   TEXT    NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE TABLE sessions (
  id         TEXT    PRIMARY KEY,
  admin_id   INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  csrf_token TEXT    NOT NULL,
  created_at TEXT    NOT NULL,
  last_seen  TEXT    NOT NULL,
  expires_at TEXT    NOT NULL
);
CREATE INDEX sessions_admin_idx ON sessions(admin_id);
CREATE INDEX sessions_expires_idx ON sessions(expires_at);

CREATE TABLE password_resets (
  token       TEXT    PRIMARY KEY,
  admin_id    INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL,
  used_at     TEXT
);

CREATE TABLE media (
  id             INTEGER PRIMARY KEY,
  kind           TEXT    NOT NULL CHECK (kind IN ('news','sponsor','vorstand')),
  original_path  TEXT    NOT NULL,
  variants_json  TEXT    NOT NULL,
  mime_type      TEXT    NOT NULL,
  uploaded_at    TEXT    NOT NULL,
  uploaded_by    INTEGER REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE news (
  id            INTEGER PRIMARY KEY,
  slug          TEXT    NOT NULL UNIQUE,
  title         TEXT    NOT NULL,
  tag           TEXT    NOT NULL,
  short         TEXT    NOT NULL,
  long_html     TEXT    NOT NULL,
  hero_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status        TEXT    NOT NULL CHECK (status IN ('draft','scheduled','published','withdrawn','deleted')),
  publish_at    TEXT,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);
CREATE INDEX news_status_publish_idx ON news(status, publish_at);

CREATE TABLE sponsors (
  id                      INTEGER PRIMARY KEY,
  name                    TEXT    NOT NULL,
  tagline                 TEXT,
  link_url                TEXT    NOT NULL,
  logo_media_id           INTEGER NOT NULL REFERENCES media(id),
  logo_has_own_background INTEGER NOT NULL DEFAULT 0,
  card_palette            TEXT    NOT NULL CHECK (card_palette IN ('transparent','purple','warm-neutral','cool-neutral')),
  weight                  INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1 AND weight <= 100),
  status                  TEXT    NOT NULL CHECK (status IN ('active','paused','archived')),
  active_from             TEXT,
  active_until            TEXT,
  notes                   TEXT,
  display_order           INTEGER NOT NULL,
  created_at              TEXT    NOT NULL,
  updated_at              TEXT    NOT NULL
);
CREATE INDEX sponsors_active_window_idx ON sponsors(status, active_from, active_until);

CREATE TABLE vorstand (
  id                INTEGER PRIMARY KEY,
  name              TEXT    NOT NULL,
  role              TEXT    NOT NULL,
  email             TEXT,
  phone             TEXT,
  portrait_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  notes             TEXT,
  status            TEXT    NOT NULL CHECK (status IN ('active','hidden','archived')),
  display_order     INTEGER NOT NULL,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL
);
CREATE INDEX vorstand_status_order_idx ON vorstand(status, display_order);
