-- Tabby initial schema. All money is stored as INTEGER minor units (paise / cents).

CREATE TABLE groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  currency    TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE members (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  upi_id      TEXT,
  position    INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_members_group ON members(group_id, position);

CREATE TABLE expenses (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  paid_by     TEXT NOT NULL REFERENCES members(id),
  date        TEXT NOT NULL,
  category    TEXT NOT NULL,
  split_mode  TEXT NOT NULL,
  created_by  TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_expenses_group ON expenses(group_id, date DESC, created_at DESC);

-- One row per participant. `weight` keeps the raw input (1 for equal, minor units for exact,
-- basis points for percentages, hundredths of a share for shares) so edits round-trip exactly.
CREATE TABLE expense_splits (
  expense_id  TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL REFERENCES members(id),
  weight      INTEGER NOT NULL,
  amount      INTEGER NOT NULL,
  PRIMARY KEY (expense_id, member_id)
);
CREATE INDEX idx_splits_member ON expense_splits(member_id);

CREATE TABLE payments (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_member TEXT NOT NULL REFERENCES members(id),
  to_member   TEXT NOT NULL REFERENCES members(id),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  date        TEXT NOT NULL,
  note        TEXT,
  created_by  TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_payments_group ON payments(group_id, date DESC, created_at DESC);
