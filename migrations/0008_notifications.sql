-- 0008_notifications.sql - Create notifications table
-- This migration creates the notifications table for tracking message delivery

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'sms', 'whatsapp', 'email'
  status TEXT DEFAULT 'pending',
  content TEXT NOT NULL,
  metadata TEXT, -- JSON string
  scheduled_for TEXT,
  sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient);
