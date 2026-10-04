-- 0003_normalize_services.sql - Ensure services table matches domain model
-- This migration updates the existing services table to match the new schema

-- Drop existing services table if it exists (data will be re-inserted)
DROP TABLE IF EXISTS services;

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  metadata TEXT, -- JSON string
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- Insert default services (from original Lumière configuration)
INSERT INTO services (id, name, price, duration, description, is_active) VALUES
  ('bridal', 'Bridal makeup', 20000, 180, 'Trial, airbrush or HD base, lashes, touch-up kit', 1),
  ('hair', 'Bridal hair and draping', 7000, 120, 'Hairstyle, jasmine or floral setting, saree draping', 1),
  ('engagement', 'Engagement and reception', 10000, 120, 'Full look with optional hairstyle', 1),
  ('family', 'Family and guests', 3500, 60, 'Per person, about 60 minutes', 1),
  ('private', 'Private lesson', 4500, 120, 'Two hours, learn a look for your features', 1);
