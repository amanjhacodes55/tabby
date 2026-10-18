# Tabby

**Split bills with friends. No signup, no ads, no daily limits. Settle up with UPI in one tap.**

Splitwise now caps how many expenses free users can add per day and shows ads, every friend has to
sign up, and in India everyone actually settles over UPI — which Splitwise has no flow for. Tabby is
the link-based alternative: create a group, share the link, and pay each other with a `upi://` deep
link or QR code.

## Features

- Create a group (name, currency, 2–50 people) — no account. The group lives at `/g/<id>`, where the id
  is 22 crypto-random URL-safe chars (132 bits). Anyone with the link can view and edit.
- "Who are you?" picker, remembered per group in `localStorage`, drives "you owe / you are owed".
- Expenses with description, amount, payer, date, category, and four split modes: **equal** (choose who's
  in), **exact amounts**, **percentages**, **shares** (fractional shares allowed).
- Money is stored as integer minor units (paise/cents). Proportional splits use the largest-remainder
  method, so they always add up exactly to the total and come out the same every time.
- Balances plus a **Settle up** plan from a greedy minimum-transactions algorithm (at most n−1 payments).
- Optional UPI ID per member (validated). For INR groups, every settle-up row gets **Pay ₹X via UPI**
  (`upi://pay?pa=…&pn=…&am=…&cu=INR&tn=…`) and a client-side QR code for desktop.
- Record payments, activity feed (newest first, who added what and when), stats (total spend, by
  category, paid vs share per person), CSV export, add/rename/remove members (removal is blocked if
  they appear in any expense or payment), rename the group.
- Mobile-first UI, light and dark themes via `prefers-color-scheme`, PWA manifest and icons, OG tags.
- Abuse limits: zod validation on every API route, 32 KB body cap, text length limits, max ₹1 crore
  (or equivalent) per amount, 50 members, 5000 expenses and 5000 payments per group.

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind v4, running on Cloudflare Workers through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). Data lives in Cloudflare D1 (binding
`DB`) and is accessed with plain prepared statements (no ORM). No secrets or env vars are needed.

```
src/lib/split.ts      split math (largest remainder, BigInt-safe)
src/lib/balances.ts   balances + greedy settle-up
src/lib/upi.ts        UPI ID validation + deep link builder
src/lib/csv.ts        CSV export
src/app/api/...       JSON API (route handlers)
migrations/           D1 migrations
```

## Local development

Requires Node 22+ (wrangler 4 needs it).

```bash
npm install
npx wrangler d1 migrations apply tabby --local   # creates the local SQLite DB under .wrangler/
npm run preview      # builds with OpenNext and serves the real Worker locally (workerd + local D1)
# or: npm run dev    # next dev, with D1 bindings proxied by wrangler
```

Checks:

```bash
npm test             # vitest: split math, settle-up, money parsing, UPI links, CSV
npm run typecheck
npm run lint
```

## Deploy to Cloudflare

```bash
npx wrangler login
npx wrangler d1 create tabby            # copy the database_id it prints
# paste it into wrangler.jsonc -> d1_databases[0].database_id (replacing REPLACE_WITH_D1_ID)
npx wrangler d1 migrations apply tabby --remote
npm run deploy                          # opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

## Security model

Like Tricount, a group's link is its password: whoever holds it can read and edit the group. Ids are
unguessable, group pages send `noindex`, and `/g/` is disallowed in `robots.txt`. There are no accounts,
so there is no per-user authorization or audit trail beyond the "added by" label (which is
self-reported).
