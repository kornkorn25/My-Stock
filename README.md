# MyStock

Live at https://mystock-clh0.onrender.com (it's on a free plan, so the first
visit after a while takes a moment to wake up).

A web app for keeping track of a US stock portfolio. You sign up, type in your
own buys and sells, and the app works out what you're holding, your average cost,
profit and loss, and how your money is split across stocks. Prices come in close
to real time, and each stock has a TradingView chart with EMA 50, 100, and 200.

It's multi-user, so everyone has their own account and sees only their own
portfolio.

## What it does

- Sign up and log in with email and password. You have to verify your email
  before the account turns on.
- Sign in with Google as well (optional, turns on once you add a client ID).
- Add, edit, and delete transactions. Holdings are recalculated from those.
- See a dashboard with totals, an allocation pie, and a holdings table.
- Open any stock for its position, support and resistance levels, and a chart.
- Change your name, email, or password from the profile page. Email and password
  changes are confirmed through a link sent to your inbox.
- Switch between light and dark mode.

## How it's built

A few ideas it sticks to:

1. The transaction list is the single source of truth. Every time you write a
  transaction, the holding is rebuilt from the whole list rather than nudged up
  or down. Running it again gives the same result.
2. Fractional shares work everywhere. Money and share amounts use `Decimal`
  (Prisma plus decimal.js), never floats.
3. Charts are the free TradingView widget, just for looking at.
4. Quotes come from Finnhub through the backend only, so the API key never
  reaches the browser. Responses are cached and the endpoint is rate limited.

## Tech

- Frontend: React, Vite, TypeScript, React Router, TanStack Query, Tailwind, Recharts
- Backend: Node, Express, TypeScript, Prisma, zod, bcrypt, JSON Web Tokens
- Email: nodemailer (falls back to printing the link to the console if no SMTP is set)
- Google sign-in: google-auth-library (verifies the ID token, no client secret needed)
- Database: SQLite out of the box. Switch the provider in the Prisma schema to use Postgres.

## Project layout

```
server/   Express API: auth, transactions, holdings, portfolio, quotes
client/   React app: dashboard, stock detail, history, profile, login
```

## Running it locally

### Backend (port 4000)

```bash
cd server
npm install
cp .env.example .env          # then fill in the values
npx prisma db push --schema=src/prisma/schema.prisma
npm run dev
```

Put your Finnhub key in `server/.env` (grab a free one at https://finnhub.io).
The app still runs without it, prices just show up as `n/a`.

### Frontend (port 5173)

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173, sign up, and add a stock. In dev, the Vite server
forwards `/api` calls to the backend on port 4000.

### Optional setup

- Google sign-in: create an OAuth client ID (Web) in Google Cloud Console, add
  `http://localhost:5173` as an authorized JavaScript origin, and put the ID in
  `GOOGLE_CLIENT_ID`. The button shows up once it's set.
- Real emails: fill in the `SMTP_*` values. Without them, verification links are
  printed to the server console so you can still test the flow.

## Tests

```bash
cd server
npm test
```

15 unit tests cover average cost, partial and full sells, fractional shares, and
the rule that you can't sell more than you hold.

## The math (in server/src/services/portfolioCalc.ts)

- Buy: `avgCost = (oldQty*oldAvg + buyQty*buyPrice + fee) / (oldQty + buyQty)`
- Sell: `realizedPnl += (sellPrice - avgCost)*sellQty - fee`, average cost stays
  the same, and you can't sell more than you own
- Position: `unrealizedPnl = qty*currentPrice - qty*avgCost`
- Allocation: `allocationPct = marketValue / totalPortfolioValue * 100`

## API

Everything except register, login, and the Google and verify endpoints needs a
`Bearer` token, and queries are scoped to the user in that token.

| Method | Path | What it does |
|--------|------|--------------|
| POST | `/api/auth/register` | create an account, sends a verification email |
| POST | `/api/auth/login` | log in, blocked until the email is verified |
| POST | `/api/auth/google` | sign in with a Google ID token |
| GET | `/api/auth/verify/:token` | confirm an email, email change, or password change |
| POST | `/api/auth/resend-verification` | send the verification email again |
| GET | `/api/auth/me` | the current user |
| PATCH | `/api/auth/profile` | change the display name |
| POST | `/api/auth/change-email` | start an email change (confirmed by link) |
| POST | `/api/auth/change-password` | start a password change (confirmed by link) |
| GET, POST | `/api/transactions` | list or add transactions |
| PUT, DELETE | `/api/transactions/:id` | edit or remove a transaction |
| GET | `/api/holdings` | holdings summary |
| DELETE | `/api/holdings/:symbol` | remove a stock and its transactions |
| GET | `/api/portfolio` | summary and positions valued at live prices |
| GET | `/api/quote?symbol=PLTR` | Finnhub quote, cached and rate limited |
| GET | `/api/profile?symbol=PLTR` | company name and logo |

## Security notes

- Passwords are hashed with bcrypt (cost 12). Nothing is stored in plain text.
- Every query filters by the user ID from the token, so one account can't see
  another's data.
- The Finnhub key, JWT secret, and database URL live only in `server/.env`,
  which is gitignored.
- All input goes through zod. Quantity and price have to be positive, and sells
  can't go past what you hold.
- The quote endpoint is rate limited and cached to stay under the Finnhub quota.
- CORS is locked to the configured client origin.

## Deploying

In production the Express server also serves the built React app, so the whole
thing runs on one domain. Build the client, build the server, point
`DATABASE_URL` at a database that survives restarts (Postgres, or SQLite on a
persistent volume), and set the environment variables from `.env.example`.
