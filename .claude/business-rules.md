# Business Rules

Loaded on demand. Reference from AGENTS.md with `.claude/business-rules.md`.

---

## Pricing

Price calculated at booking creation and stored. Never recomputed on read. Admin can override.
`billable_days = date_to - date_from + 1`. Minimum stay: 2 days.
Season evaluated per day — boundary-spanning bookings billed at each day's rate.
Easter computed via Butcher algorithm at runtime. Never hardcoded.

**High season:** 15 Jun–15 Aug · 20 Dec–2 Jan · Palm Sunday through 2nd Easter day.

### Rate Table (NOK/day)

| Cage type      | Season | 1 cat | 2 cats | 3 cats |
|----------------|--------|------:|-------:|-------:|
| standard       | Low    | 220   | 320    | —      |
| standard       | High   | 250   | 350    | —      |
| senior_comfort | Low    | 220   | 320    | —      |
| senior_comfort | High   | 250   | 350    | —      |
| suite          | Low    | 350   | 350    | 400    |
| suite          | High   | 450   | 450    | 450    |

3-cat standard split (2-cat + 1-cat cage): Low 540/day · High 600/day.

---

## Cancellation Policy

User cancellations may incur a fee. Admin cancellations never do.
Fee = 50% of total post-deal price. Admin triggers fee notice manually — system does not auto-charge.
Season determined by **check-in date**, not cancellation date.

| Season | Free cancellation window |
|--------|--------------------------|
| Low    | More than 24 hours before midnight of check-in |
| High   | Before midnight, 7 days before check-in |

---

## Payment Flow

Manual Vipps to business account — no payment gateway.
On `confirmed`: system emails user Vipps business account number + payment reference.
Only admins can mark payment received. `payment_status` defaults to `unpaid`.
Payment confirmation logged in `audit_log`.

---

## Email Triggers

| Transition | Recipient |
|---|---|
| `pending` created | User — request received |
| `waitlisted` created | User — waitlist notification |
| `pending → confirmed` | User — confirmed + Vipps payment instructions |
| `pending → cancelled` (admin rejects) | User — rejected |
| `confirmed → cancelled` (user, breach) | User — cancellation + fee notice |
| `confirmed → cancelled` (admin) | User — cancellation, no fee |
| `waitlisted → offer_sent` | User — offer with dates/cage/note |
| `offer_sent → confirmed` | Admin (offer accepted) + User (confirmed + Vipps) |
| `offer_sent` deadline expires | Admin — expired notification |
| Admin edits dates/price on confirmed | User — booking updated |

Emails via Resend, `src/lib/email/`. Templates in `src/lib/email/templates/`.
Never send emails from components or outside `src/lib/email/`. Failures must be logged.

---

## Cage Conflict Rule

Two cage assignments conflict if:
```
A.date_from < B.date_to AND B.date_from < A.date_to
```
Same-day turnover (`A.date_to === B.date_from`) is **not** a conflict.
Both cat conflict and cage availability enforced server-side via RPC before insertion.

---

## Norwegian Route Glossary

| Segment | Meaning |
|---|---|
| `bookinger` | bookings |
| `mine-katter` | my cats |
| `minside` | user portal |
| `innsjekk` | check-in |
| `burplassering` | cage assignment |
| `avbestillinger` | cancellations |
| `endringslogg` | audit log |
| `brukere` | users |
| `bur` | cages |

UI and routes: Norwegian. Code, comments, variable names: English.
