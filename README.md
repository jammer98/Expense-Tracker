# Expense Tracker with Automated Reports

A multi-user expense tracking API with JWT authentication, category-based organization, and spending reports — both on-demand and delivered automatically via a scheduled weekly email.

## Features

- JWT-based authentication (register/login), with every expense and report scoped to the authenticated user
- Category system with global defaults (Food, Transport, Rent, etc.) plus per-user custom categories
- Full expense CRUD, with ownership enforced at the query level — a user can never read, edit, or delete another user's data
- On-demand summary reports: total spend and per-category breakdown over any date range
- Automated weekly email reports (via a scheduled job), summarizing each user's spend over the last 7 days
- Structured JSON logging (Pino) with request correlation IDs
- Centralized error handling distinguishing expected errors (4xx, logged as warnings) from unexpected ones (5xx, logged with full detail, generic message returned to the client)

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express |
| Database | PostgreSQL |
| Auth | JSON Web Tokens (bcryptjs for hashing) |
| Scheduled jobs | node-cron |
| Email | Resend |
| Logging | Pino + pino-http |

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

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database
- A free [Resend](https://resend.com) account (for the weekly email reports)

### Setup
```bash
git clone <this-repo-url>
cd <repo-folder>
npm install
cp .env.example .env
```

Fill in `.env`:
```
DATABASE_URI=postgres://user:password@host:port/dbname
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_EXPIRES_IN=7d
RESEND_API_KEY=
PORT=3002
```

Run the schema SQL above against your database, then:
```bash
npm run dev
```

## API

### Auth
```bash
curl -X POST localhost:3002/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Jam","email":"jam@test.com","password":"secret123"}'

curl -X POST localhost:3002/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"jam@test.com","password":"secret123"}'
```
Both return `{ user, token }`. Pass the token on every request below as `Authorization: Bearer <token>`.

### Categories
```bash
curl localhost:3002/api/categories -H "Authorization: Bearer <token>"
```

### Expenses
```bash
# Create
curl -X POST localhost:3002/api/expenses -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"categoryId": 1, "amount": 450.50, "description": "Groceries", "spentOn": "2026-09-15"}'

# List (with optional filters)
curl "localhost:3002/api/expenses?categoryId=1&startDate=2026-09-01&endDate=2026-09-30" \
  -H "Authorization: Bearer <token>"

# Update / Delete
curl -X PATCH localhost:3002/api/expenses/1 -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"amount": 500}'
curl -X DELETE localhost:3002/api/expenses/1 -H "Authorization: Bearer <token>"
```

### Reports
```bash
curl "localhost:3002/api/reports/summary?startDate=2026-09-01&endDate=2026-09-30" \
  -H "Authorization: Bearer <token>"
```
Returns total spend, expense count, and a per-category breakdown with percentages.

The same underlying query also powers a scheduled job (`node-cron`, every Monday 8 AM) that emails each user their weekly spending summary via Resend.

## Possible Extensions

- Refresh tokens with rotation, for revocable sessions and shorter-lived access tokens
- Budget limits per category, with alerts when exceeded
- CSV/PDF export of reports
- Recurring expense support (subscriptions, rent)