# AGENTS.md — Mathopen Kattepensjonat V2

Single source of truth for all AI agents. Read fully before touching anything.
CLAUDE.md imports this file. All other agent configs defer to it.

<!-- BEGIN:nextjs-agent-rules -->
## ⚠ This is NOT the Next.js you know
Breaking changes exist. Read `node_modules/next/dist/docs/` before writing any Next.js code.
Heed deprecation notices. Do not assume — check the docs.
<!-- END:nextjs-agent-rules -->

---

## Project

Live cat hotel management system for a Norwegian business. V1 is in production. V2 is a clean-room rebuild.

Stack: Next.js App Router · Supabase (PostgreSQL + RLS) · TypeScript · Tailwind · shadcn/ui · Resend · Vercel

---

## Build & Test Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run test:run     # Vitest (unit + integration), run before every commit
npx playwright test  # E2E — run only after Vitest passes
```

A feature is not done until `npm run test:run` passes for it.

---

## Hard Rules — No Exceptions

### Data Safety
- Zero hard deletes on `profiles`, `cats`, `bookings` — use `deleted_at` only
- `ON DELETE RESTRICT` on all FK constraints — no cascades, ever
- `booking_snapshots` is write-once — never update or delete
- `audit_log` is append-only — never update or delete

### Date Construction
Never `toISOString()`. Always build from local parts:
```ts
`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
```
Billing = `date_to - date_from + 1` (inclusive). Occupancy = `[date_from, date_to)` (exclusive). Never conflate.

### Security — Three Layers, All Required
1. Zod validation (`src/schemas/`) — runs first on every server action
2. Auth check — `supabase.auth.getUser()` + `is_admin()` or `is_staff()` RPC
3. RLS — last line of defense at the database layer

Never skip a layer. Never expose service role client to the client.

### Server/Client Boundary
- `'use server'` — only in `src/server/`
- `'use client'` — only in `src/components/`
- `lib/` — zero DB calls, pure logic only

### Never Do
- Add `ON DELETE CASCADE` to any FK
- Use `toISOString()` for dates
- Recompute price from dates at runtime — always read `bookings.price`
- Enforce capacity client-side as source of truth — display only
- Swallow errors silently (especially snapshot creation and email sending)
- Use `window.print()` — use `@react-pdf/renderer` via `BookingPDFButton`
- Re-open locked decisions without explicit instruction

---

## Booking Status Machine

```
pending     → confirmed    (admin approves)
pending     → waitlisted   (any night fully booked at submission)
pending     → cancelled    (admin rejects OR user cancels)

waitlisted  → offer_sent   (admin sends offer)
offer_sent  → confirmed    (user accepts)
offer_sent  → waitlisted   (user declines)
offer_sent  → cancelled    (deadline expires or user cancels)

confirmed   → checked_in   (admin/staff completes check-in)
confirmed   → cancelled    (user or admin cancels)

checked_in  → completed    (admin/staff completes check-out)
```

`completed` and `cancelled` are terminal — no transitions out.
`waitlisted → confirmed` directly is **forbidden** — must pass through `offer_sent`.
`checked_in → cancelled` is **forbidden** via system.
Staff cannot: `pending → confirmed`, `pending → cancelled`, `confirmed → cancelled`.

Capacity never returns an error — full capacity → `waitlisted`, not a rejection.
`pending`, `confirmed`, `checked_in` block capacity. `waitlisted`, `completed`, `cancelled` do not.

See `.claude/business-rules.md` for pricing, cancellation policy, and email trigger table.

---

## Roles

| Operation                    | User | Staff | Admin |
|------------------------------|:----:|:-----:|:-----:|
| Create / cancel own booking  | ✓    |       |       |
| View all bookings            |      | ✓     | ✓     |
| Check-in / check-out         |      | ✓     | ✓     |
| Assign cages                 |      | ✓     | ✓     |
| Approve / reject / cancel any|      |       | ✓     |
| Confirm payment              |      |       | ✓     |
| Manage deals / users / cages |      |       | ✓     |
| View audit log / snapshots   |      |       | ✓     |

---

## Never Expose to Clients
- `booking_snapshots` — no client, ever
- `profiles.role` — not to user client
- `audit_log` — not to users or staff
- Soft-deleted records — filter at RLS, not app layer
- Price — always from stored `bookings.price`

---

## Legal
Records retained minimum 5 years (Bokføringsloven § 13). `booking_snapshots` is the compliance record — must exist for every booking. Eligible for purge only after 5 years from `snapshot_at`.

---

## Reference Documents
Loaded on demand — do not inline these into every session.

- `.claude/business-rules.md` — pricing table, cancellation policy, email triggers, payment flow
- `.claude/patterns.md` — server action pattern, Zod conventions, audit log pattern, Supabase client usage, date utility
- `.claude/testing.md` — Vitest setup, Playwright setup, required test cases, CI config
