-- 0010_migrate_data.sql - Migrate legacy appointments into the normalized schema.
-- This migration is intentionally SQLite/D1 compatible: it does not rely on
-- non-SQLite hash functions.

INSERT INTO customers (id, name, phone, email, created_at, updated_at)
SELECT
  'legacy-' || lower(hex(randomblob(16))) AS id,
  MAX(client_name),
  client_phone,
  MAX(client_email),
  MIN(created_at),
  MAX(updated_at)
FROM appointments
GROUP BY client_phone;

INSERT INTO bookings (
  id, customer_id, service_id, event_date, appointment_date, appointment_time,
  status, notes, price_at_booking, duration_at_booking, created_at, updated_at
)
SELECT
  'apt-' || a.id,
  (SELECT c.id FROM customers c WHERE c.phone = a.client_phone LIMIT 1),
  CASE
    WHEN lower(a.service) LIKE '%bridal%' THEN 'bridal'
    WHEN lower(a.service) LIKE '%hair%' THEN 'hair'
    WHEN lower(a.service) LIKE '%engagement%' THEN 'engagement'
    WHEN lower(a.service) LIKE '%family%' THEN 'family'
    WHEN lower(a.service) LIKE '%private%' THEN 'private'
    ELSE 'bridal'
  END,
  a.event_date,
  a.appointment_date,
  a.appointment_time,
  CASE WHEN a.status IN ('pending','confirmed','completed','cancelled') THEN a.status ELSE 'pending' END,
  a.inputs_text,
  COALESCE((SELECT s.price FROM services s WHERE s.id = CASE
    WHEN lower(a.service) LIKE '%bridal%' THEN 'bridal'
    WHEN lower(a.service) LIKE '%hair%' THEN 'hair'
    WHEN lower(a.service) LIKE '%engagement%' THEN 'engagement'
    WHEN lower(a.service) LIKE '%family%' THEN 'family'
    WHEN lower(a.service) LIKE '%private%' THEN 'private'
    ELSE 'bridal' END), 0),
  COALESCE((SELECT s.duration FROM services s WHERE s.id = CASE
    WHEN lower(a.service) LIKE '%bridal%' THEN 'bridal'
    WHEN lower(a.service) LIKE '%hair%' THEN 'hair'
    WHEN lower(a.service) LIKE '%engagement%' THEN 'engagement'
    WHEN lower(a.service) LIKE '%family%' THEN 'family'
    WHEN lower(a.service) LIKE '%private%' THEN 'private'
    ELSE 'bridal' END), 60),
  a.created_at,
  a.updated_at
FROM appointments a
WHERE a.appointment_time IS NOT NULL AND trim(a.appointment_time) <> '';

INSERT INTO inquiries (
  id, name, phone, email, service_id, event_date, status, notes, created_at, updated_at
)
SELECT
  'inq-' || a.id,
  a.client_name,
  a.client_phone,
  a.client_email,
  CASE
    WHEN lower(a.service) LIKE '%bridal%' THEN 'bridal'
    WHEN lower(a.service) LIKE '%hair%' THEN 'hair'
    WHEN lower(a.service) LIKE '%engagement%' THEN 'engagement'
    WHEN lower(a.service) LIKE '%family%' THEN 'family'
    WHEN lower(a.service) LIKE '%private%' THEN 'private'
    ELSE NULL
  END,
  a.event_date,
  'new',
  a.inputs_text,
  a.created_at,
  a.updated_at
FROM appointments a
WHERE a.appointment_time IS NULL OR trim(a.appointment_time) = '';
