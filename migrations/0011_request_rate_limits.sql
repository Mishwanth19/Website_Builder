-- D1-backed abuse throttling for authentication and public submission endpoints.
CREATE TABLE IF NOT EXISTS request_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_request_rate_limits_expires
  ON request_rate_limits(expires_at);
