# Expense Tracker with Automated Reports

A multi-user expense tracking API with JWT authentication, category-based organization, and spending reports — both on-demand and delivered automatically via a scheduled weekly email.

**Live demo:** https://expense-tracker-b61i.onrender.com
*(hosted on Render's free tier — the first request after idle time may take ~30-60s to wake the instance)*

[![CI](https://github.com/jammer98/Expense-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/jammer98/Expense-Tracker/actions/workflows/ci.yml)

## Features

- JWT-based authentication (register/login), with every expense and report scoped to the authenticated user
- Category system with global defaults (Food, Transport, Rent, etc.) plus per-user custom categories
- Full expense CRUD, with ownership enforced at the query level — a user can never read, edit, or delete another user's data
- On-demand summary reports: total spend and per-category breakdown over any date range
- Weekly email report job (via Resend) — summarizes each user's spend over the last 7 days; wired up and tested, currently triggered manually rather than on the cron schedule
- Structured JSON logging (Pino) with request correlation IDs
- Centralized error handling distinguishing expected errors (4xx, logged as warnings) from unexpected ones (5xx, logged with full detail, generic message returned to the client)
- Containerized with Docker, tested and built in CI, deployed as a published container image

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 24 (ES Modules) |
| Framework | Express |
| Database | PostgreSQL ([Neon](https://neon.tech), hosted) |
| Auth | JSON Web Tokens (bcryptjs for hashing) |
| Scheduled jobs | node-cron |
| Email | Resend |
| Logging | Pino + pino-http |
| Testing | Vitest |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Container registry | GitHub Container Registry (GHCR) |
| Hosting | Render (deployed from a GHCR image) |

## Database Design

Three entities: `users`, `categories`, `expenses`.

- `categories.user_id` is **nullable** — `NULL` marks a global default category available to everyone; a real value marks a user's own custom category.
- `expenses` holds foreign keys to both `users` and `categories`, plus a `spent_on` date (the actual expense date, separate from `created_at`, the row-insert timestamp) — reports filter and group on `spent_on`.
- Indexes on `expenses.user_id` and `expenses.spent_on`, since both are hit on nearly every report query.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (name, user_id)
);

CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  spent_on DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_spent_on ON expenses(spent_on);

-- Seed a few global categories
INSERT INTO categories (name, user_id) VALUES ('Food', NULL), ('Transport', NULL), ('Rent', NULL), ('Utilities', NULL);
```

## Architecture Notes

- **Ownership scoping**: every expense query filters by `user_id`, not just `id` — this is what prevents cross-user data access, and it happens at the database query itself, not as an after-the-fact check.
- **Reporting queries use `LEFT JOIN`, not `INNER JOIN`**: an expense with no category still appears in reports (grouped under "Uncategorized"), and the weekly-summary query `LEFT JOIN`s from `users` so a user with zero expenses still gets a row (total = 0) — both matter for correctness, not just style.
- **Single access token, no refresh token**: a deliberate simplicity tradeoff. A production system would pair a short-lived access token with a longer-lived refresh token (see Possible Extensions).
- **Cache-free by design**: unlike a read-heavy lookup service, expense data changes constantly and reports are computed fresh — there's no stale-cache tradeoff worth taking on here.

## CI/CD Pipeline

Every push to `main` runs a GitHub Actions workflow (`.github/workflows/ci.yml`) that:

1. Checks out the code and installs dependencies (`npm ci`)
2. Runs the test suite (Vitest)
3. Builds the Docker image (fails the build if the image doesn't build cleanly)
4. On success, builds and pushes the image to GHCR: `ghcr.io/jammer98/expense-tracker:latest`

The `push-image` job only runs if `build-and-test` passes, so a broken test or a broken build never reaches the registry.

```
git push → GitHub Actions → npm ci → tests → docker build → (if main) → push to GHCR → Render pulls new image
```

## Running Locally with Docker (recommended)

```bash
git clone <this-repo-url>
cd Expense-Tracker
docker compose up --build
```

This starts:
- **api** — the Express app, on port 3000
- **postgres** — Postgres 16, with `users`/`categories`/`expenses` auto-created and seeded from `init.sql`

Verify it's up:
```bash
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Jam","email":"jam@test.com","password":"secret123"}'
```

## Running Locally without Docker

### Prerequisites
- Node.js 20+
- A PostgreSQL database
- A free [Resend](https://resend.com) account (for the weekly email reports)

### Setup
```bash
git clone <this-repo-url>
cd Expense-Tracker
npm install
cp .env.example .env
```

Fill in `.env`:
```
DATABASE_URL=postgres://user:password@host:port/dbname
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_EXPIRES_IN=7d
RESEND_API_KEY=<your Resend API key>
PORT=3000
```

Run the schema SQL above against your database, then:
```bash
npm run dev
```

## Deployment

The app is deployed as a container, not with a platform's auto-deploy-from-source feature:

- **Image**: built and published by CI to `ghcr.io/jammer98/expense-tracker` on every push to `main`
- **Hosting**: [Render](https://render.com) Web Service, running the published image
- **Database**: [Neon](https://neon.tech) — managed, serverless Postgres
- **Email**: [Resend](https://resend.com) — verified and working

Environment variables are set directly in Render's dashboard and are never committed to the repo (see `.gitignore`).

## API

Base URL: `https://expense-tracker-b61i.onrender.com` (or `http://localhost:3000` locally)

### Auth
```bash
curl -X POST <base_url>/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Jam","email":"jam@test.com","password":"secret123"}'

curl -X POST <base_url>/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"jam@test.com","password":"secret123"}'
```
Both return `{ user, token }`. Pass the token on every request below as `Authorization: Bearer <token>`.

### Categories
```bash
curl <base_url>/api/categories -H "Authorization: Bearer <token>"
```

### Expenses
```bash
# Create
curl -X POST <base_url>/api/expenses -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"categoryId": 1, "amount": 450.50, "description": "Groceries", "spentOn": "2026-09-15"}'

# List (with optional filters)
curl "<base_url>/api/expenses?categoryId=1&startDate=2026-09-01&endDate=2026-09-30" \
  -H "Authorization: Bearer <token>"

# Update / Delete
curl -X PATCH <base_url>/api/expenses/1 -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"amount": 500}'
curl -X DELETE <base_url>/api/expenses/1 -H "Authorization: Bearer <token>"
```

### Reports
```bash
curl "<base_url>/api/reports/summary?startDate=2026-09-01&endDate=2026-09-30" \
  -H "Authorization: Bearer <token>"
```
Returns total spend, expense count, and a per-category breakdown with percentages.

The same underlying query also powers the weekly email summary job via Resend.

## Testing

```bash
npm test
```
Runs the Vitest suite. This also runs automatically in CI on every push and pull request to `main`.

## Possible Extensions

- Refresh tokens with rotation, for revocable sessions and shorter-lived access tokens
- Budget limits per category, with alerts when exceeded
- CSV/PDF export of reports
- Recurring expense support (subscriptions, rent)
- Enable the weekly report on its actual cron schedule (currently manual-trigger only)

## Front-end

- Frontend repo: <https://github.com/jammer98/BudgetBase.git>
- Not yet deployed — now that the backend has a stable live API, this is next up.
