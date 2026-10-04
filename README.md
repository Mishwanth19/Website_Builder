# Lumière Bridal Booking System

A complete appointment booking system for a bridal makeup artist, built on Cloudflare's developer platform.

## Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Static HTML/CSS/JS (Cloudflare Pages) |
| **API/Backend** | Cloudflare Workers (TypeScript) |
| **Database** | D1 (SQLite at edge) |
| **Storage** | R2 (for images/assets) |
| **Messaging** | Twilio (SMS/WhatsApp) - optional |
| **Scheduler** | Cloudflare Cron Triggers |

## Project Structure

```text
lumiere-bridal/
├── public/                  # Cloudflare Pages website
│   ├── index.html
│   ├── css/
│   └── js/main.js
├── src/
│   ├── index.ts             # Cloudflare Worker entry point
│   ├── api/                 # HTTP handlers
│   ├── app/                 # Router, middleware, composition
│   ├── modules/             # Booking, auth, customers, services, etc.
│   ├── infrastructure/      # D1, crypto, messaging, clock adapters
│   ├── config/
│   └── shared/
├── migrations/              # Ordered D1 migrations
├── wrangler.toml
└── package.json
```

## Quick Start

### 1. Install dependencies
```bash
cd lumiere-bridal
npm install
```

### 2. Login to Cloudflare
```bash
npx wrangler login
```

### 3. Create D1 database
```bash
npx wrangler d1 create lumiere-appointments
# Copy the database_id from output → update wrangler.toml
```

### 4. Run migrations (local first)
```bash
npx wrangler d1 migrations apply lumiere-appointments --local
```

### 5. Set up environment variables
```bash
# Copy example file
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your credentials
# For local development, .dev.vars is used automatically
# For production, use wrangler secret put
```

### 6. Start development server
```bash
npm run dev
# Opens at http://localhost:8787
```

### 6. Deploy to production
```bash
# Deploy Worker
npx wrangler deploy

# Deploy Pages (connect GitHub repo to Cloudflare Pages dashboard)
# Build: no build command | Output: public/
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/services` | List all services with pricing |
| GET | `/api/availability?service=X&date=YYYY-MM-DD` | Get available time slots |
| POST | `/api/book` | Book an appointment |
| POST | `/api/contact` | Submit inquiry (no time slot) |
| GET | `/api/appointments?status=X&date=X&limit=50` | List appointments |
| PATCH | `/api/appointments` | Update status `{id, status}` |
| GET | `/api/client-view` | View authenticated customer's bookings |
| GET | `/api/admin-view?view=today|upcoming|pending|all` | Admin/staff dashboard view |
| POST | `/api/auth/login` | Admin login; session cookie is issued |
| GET | `/api/auth/verify` | Verify current session |
| POST | `/api/auth/logout` | End current session |
| POST | `/api/auth/customer/request-otp` | Request customer phone OTP |
| POST | `/api/auth/customer/verify-otp` | Verify OTP and create customer session |

## Database Schema

```sql
appointments (
  id INTEGER PRIMARY KEY,
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  service TEXT,
  event_date TEXT,
  appointment_date TEXT,
  appointment_time TEXT,
  status TEXT,  -- pending | confirmed | completed | cancelled
  inputs_text TEXT,
  created_at TEXT,
  updated_at TEXT
)
```

## Automated Follow-ups (Cron)

Runs daily at 9 AM via `wrangler.toml` schedule:
- **Reminders**: SMS to clients with appointments tomorrow
- **Payment nudges**: To pending bookings older than 24h
- **Thank you**: To completed appointments (last 7 days)

## Environment Variables (Secrets)

Set via `wrangler secret put` or dashboard:

| Secret | Description |
|--------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM` | Twilio phone number (verified) |
| `ARTIST_PHONE` | Artist's phone for notifications |
| `ADMIN_USERNAME` | Admin username (default: admin) |
| `ADMIN_PASSWORD` | Development-only admin password; use `ADMIN_PASSWORD_HASH` in production |

```bash
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put TWILIO_FROM
npx wrangler secret put ARTIST_PHONE
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
```

**Production security:** set `ADMIN_PASSWORD_HASH` rather than `ADMIN_PASSWORD`, configure `ALLOWED_ORIGINS` to the real website origin(s), and keep Twilio/provider credentials in Cloudflare secrets.

## Test Users

### Admin Access
- **Username**: `admin`
- **Password**: `admin123`
- Access via: Admin link in navigation menu → #admin-login

### Client Access
- Customer access uses a phone OTP session.
- The customer must verify the phone number before viewing bookings.
- Access via: "My Appointments" link in navigation menu → #my-appointments

## SMS/WhatsApp Integration

The `src/scheduler.ts` includes a `sendMessage` function. Currently logs to console.

To enable real SMS:
1. Get Twilio trial account (free $15 credit)
2. Add secrets above
3. Uncomment Twilio fetch in `sendMessage`

## Cost Estimate (India)

| Service | Free Tier | Typical Usage |
|---------|-----------|---------------|
| Workers | 100k req/day | ~₹0 |
| D1 | 5 GB, 5M reads | ~₹0 |
| Pages | Unlimited | ~₹0 |
| R2 | 10 GB | ~₹0 |
| Twilio (trial) | $15 credit | ~₹0-300/month |
| **Total** | | **₹0-300/month** |

## Custom Domain

1. Buy domain (Cloudflare Registrar: ~₹150/yr for `.in`, ~₹1,000/yr for `.com`)
2. Add to Cloudflare Pages → Custom domains
3. Email routing: free `hello@yourdomain.com` → forwards to Gmail

## For Client Deployment

When building for a client:
1. Fork this repo
2. Update `public/index.html` with their branding
3. Create new D1 database for them
4. Set up their Twilio account (or use yours)
5. Deploy to their Cloudflare account

## License

MIT