-- 20240101_init.sql - Initial schema for Lumière bridal booking system

CREATE table if not exists appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  service TEXT NOT NULL,
  event_date TEXT,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  inputs_text TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_created ON appointments(created_at DESC);

-- Create services table for reference (used in scheduler queries)
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER,
  duration INTEGER,
  description TEXT
);

-- Insert default services
INSERT INTO services (id, name, price, duration, description) VALUES
  ('bridal', 'Bridal makeup', 20000, 180, 'Trial, airbrush or HD base, lashes, touch-up kit'),
  ('hair', 'Bridal hair and draping', 7000, 120, 'Hairstyle, jasmine or floral setting, saree draping'),
  ('engagement', 'Engagement and reception', 10000, 120, 'Full look with optional hairstyle'),
  ('family', 'Family and guests', 3500, 60, 'Per person, about 60 minutes'),
  ('private', 'Private lesson', 4500, 120, 'Two hours, learn a look for your features');