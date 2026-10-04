-- 0009_business_config.sql - Create business configuration tables
-- This migration creates tables for business hours and blocked periods

CREATE TABLE IF NOT EXISTS business_hours (
  id TEXT PRIMARY KEY,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 6 = Saturday
  open_time TEXT NOT NULL, -- HH:MM
  close_time TEXT NOT NULL, -- HH:MM
  is_closed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_business_hours_day ON business_hours(day_of_week);

-- Insert default business hours (Mon-Sat, 9AM-7PM)
INSERT INTO business_hours (id, day_of_week, open_time, close_time, is_closed) VALUES
  ('sun', 0, '09:00', '19:00', 1),
  ('mon', 1, '09:00', '19:00', 0),
  ('tue', 2, '09:00', '19:00', 0),
  ('wed', 3, '09:00', '19:00', 0),
  ('thu', 4, '09:00', '19:00', 0),
  ('fri', 5, '09:00', '19:00', 0),
  ('sat', 6, '09:00', '19:00', 0);

CREATE TABLE IF NOT EXISTS blocked_periods (
  id TEXT PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blocked_periods_dates ON blocked_periods(start_date, end_date);
