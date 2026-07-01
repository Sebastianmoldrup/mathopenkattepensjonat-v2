## Project Overview

Mathopen Kattepensjonat V1 was developed solo between December 2025 and June 2026 under time constraints, dual jobs, and job searching. Due to initial operational ambiguity from the client, the booking functionality required an overhaul.

Running the live system revealed that local testing does not always encompass the environment of the user — such as clients opening links via in-app email browsers where missing cookies broke user validation.

Having validated the business model and gained valuable practical experience through live production problem-solving, this project is being completely remade from the ground up.

This is the V2 Greenfield Rewrite of Mathopen Kattepensjonat.

---

## System Map & Navigation

- [[#1. Requirements Analysis]] — Core rules, features, and constraints.
- [[#2. Business Logic & Rules]] — State machines, policy rules, and system constraints.
- [[#3. Data Architecture & Domain Model]] — Database tables, keys, and RLS security.
- [[#4. Security Architecture]] — Validation layers, auth model, and defense in depth.
- [[#5. File Architecture]] — Project structure and conventions.
- [[#6. Behavioral Workflows]] — Sequence diagrams for business logic.
- [[#7. UI/UX Interface Specification]] — Form structures and dashboard layouts.
- [[#8. Testing & CI/CD Strategy]] — Frameworks, test scope, automation pipeline, and implementation.
-  [[#9. Migration Plan]] — V1 to V2 data migration strategy.

---

## 1. Requirements Analysis

### Functional Requirements (FR)

#### User Portal

- **FR-101:** User registration and profile management.
- **FR-102:** Cat registration, edit, and soft-delete.
- **FR-103:** Users can view their own bookings.

#### Admin Panel

- **FR-201:** Admin dashboard with income overview and daily task summary.
- **FR-202:** Admins can manage bookings, including approval, rejection, and editing.
- **FR-202b:** Admins can view cat profiles associated with a booking.
- **FR-203:** Admins can manage booking cancellations.
- **FR-203b:** The system notifies users when a cancellation breach fee applies.
- **FR-204:** Admins can assign and split bookings to cages.
- **FR-205:** Admins can export booking documentation as PDF.
- **FR-206:** Admins can perform and track check-in and check-out for bookings.
- **FR-207:** Admins can create deals and assign them to users.
- **FR-208:** Admins can generate physical cage label PDFs per booking or as a daily batch.
- **FR-209:** Admins can manage waitlisted bookings and send booking offers to users.
- **FR-210:** Admins can configure cage types and outdoor designation per physical cage.
- **FR-211:** Admins can view and manage all registered users, sortable by name, last name, email, and phone number.
- **FR-212:** Admins can view a changelog of all mutations made in the admin panel, including who made each change.
- **FR-213:** Admins can manually confirm payment received for a booking.

#### Staff Panel

- **FR-251:** Staff can view the full booking table.
- **FR-252:** Staff can perform check-in and check-out, transitioning bookings from `confirmed` to `checked_in` and `checked_in` to `completed`.
- **FR-253:** Staff can view cat and booking information associated with a booking.
- **FR-254:** Staff can assign physical cages to confirmed bookings.

#### Booking

- **FR-301:** Authenticated users can create a booking.
- **FR-302:** Unauthenticated users can initiate a booking as a guest.
- **FR-303:** Guest booking data is preserved and linked to a staged profile on submission.
- **FR-304:** A user must have at least one registered cat before completing a booking.
- **FR-305:** The booking system enforces capacity constraints when selecting dates. If any night in the selected range is fully booked, the booking is automatically submitted with status `waitlisted` instead of `pending`.

#### System

- **FR-401:** Transactional email notifications for booking lifecycle events.
- **FR-402:** User authentication including registration, login, and password reset.
- **FR-403:** Payment instructions are sent to the user by email upon booking confirmation, containing Vipps business account details.

---

### Non-Functional Requirements (NFR)

- **NFR-101 (Data Safety):** Zero hard deletes on critical tables (`cats`, `bookings`).
- **NFR-102 (Data Safety):** Deletion of a parent record must not cascade to and destroy dependent records.
- **NFR-103 (Security):** Supabase Row Level Security (RLS) must block cross-user data leaks.
- **NFR-104 (Cost):** System must run completely within standard free-tier limits.
- **NFR-105 (SEO):** Content and configurations must be SEO optimized.
- **NFR-106 (Legal):** Booking and identity records must be retained for a minimum of 5 years in compliance with Bokføringsloven § 13.
- **NFR-107 (Email):** Transactional emails must pass SPF/DKIM validation. Resend sending domain must be verified before production launch.
- **NFR-108 (Accessibility):** UI must meet minimum WCAG AA compliance for interactive elements.

---

## 2. Business Logic & Rules

### 2.1 Booking Status Machine

#### States

|Status|Description|
|---|---|
|`pending`|Booking submitted by authenticated user. Awaiting admin review.|
|`waitlisted`|Requested dates are fully booked. Held for manual admin promotion.|
|`offer_sent`|Admin has sent a waitlist offer with proposed cage/dates. Awaiting user response.|
|`confirmed`|Admin approved, or user accepted a waitlist offer. Booking is guaranteed. Payment instructions sent.|
|`checked_in`|Cats have physically arrived. Check-in checklist completed by admin or staff.|
|`completed`|Cats have been collected. Check-out checklist completed by admin or staff.|
|`cancelled`|Booking cancelled by user or rejected/cancelled by admin.|

#### Valid Transitions

```
pending      → confirmed     (admin approves)
pending      → waitlisted    (requested dates fully booked at submission)
pending      → cancelled     (admin rejects OR user cancels)

waitlisted   → offer_sent    (admin selects booking and sends offer)
offer_sent   → confirmed     (user accepts offer)
offer_sent   → waitlisted    (user declines — returned to waitlist)
offer_sent   → cancelled     (offer deadline expires or user explicitly cancels)

confirmed    → checked_in    (admin or staff completes check-in on arrival day)
confirmed    → cancelled     (user or admin cancels — cancellation policy applies)

checked_in   → completed     (admin or staff completes check-out on departure day)

completed    → [terminal]
cancelled    → [terminal]
```

#### Forbidden Transitions

- `completed` and `cancelled` cannot transition to any other state.
- `checked_in` cannot be cancelled through the system. Admin must handle operationally.
- Status cannot jump from `waitlisted` directly to `confirmed` — must pass through `offer_sent`.
- Staff cannot perform `pending → confirmed`, `pending → cancelled`, or `confirmed → cancelled`.

#### Capacity Check & Automatic Waitlisting

A booking never returns an error due to full capacity. Instead, the capacity check determines the booking's initial status:

|Capacity check result|Initial status|
|---|---|
|All nights in the range are available|`pending`|
|One or more nights are fully booked|`waitlisted`|

The customer sees clearly in the booking summary (step 5) whether they are on the waitlist. Both outcomes send a confirmation email — see the email trigger table below.

#### Email Triggers by Transition

|Transition|Recipient|
|---|---|
|`pending` created|User — booking request received|
|`waitlisted` created|User — waitlist notification|
|`pending` → `confirmed`|User — booking confirmed + Vipps payment instructions|
|`pending` → `cancelled` (admin rejects)|User — booking rejected|
|`confirmed` → `cancelled` (user cancels, breach)|User — cancellation + fee notice|
|`confirmed` → `cancelled` (admin cancels)|User — cancellation notice, no fee|
|`waitlisted` → `offer_sent`|User — offer with proposed dates/cage/note|
|`offer_sent` → `confirmed`|Admin — offer accepted + User — confirmed + Vipps payment instructions|
|`offer_sent` deadline expires|Admin — offer expired notification|
|Admin edits dates or price on confirmed booking|User — booking updated|

---

### 2.2 Payment Flow

- Payment is handled **manually via Vipps** to the business account.
- On `confirmed`, the system sends the user an email containing the Vipps business account number and payment reference.
- Admin manually verifies payment received in Vipps and marks the booking as paid in the system.
- The system operates on trust — there is no automated payment deadline or cancellation trigger for unpaid bookings.

#### Payment Fields on Booking

|Field|Type|Description|
|---|---|---|
|`payment_status`|`unpaid \| paid`|Set to `unpaid` on creation, updated by admin|
|`payment_confirmed_at`|`timestamp \| null`|Set when admin marks as paid|
|`payment_confirmed_by`|`uuid → profiles.id \| null`|Admin who confirmed payment|

#### Rules

- `payment_status` defaults to `unpaid` on all new bookings.
- Only admins can mark a booking as paid.
- Payment confirmation is logged in `audit_log`.
- Cancellation policy and breach fees are independent of payment status.

---

### 2.3 Cancellation Policy

#### Notice Windows

|Season at check-in|Free cancellation window|Breach fee|
|---|---|---|
|Low season|More than 24 hours before midnight of check-in day|50% of total booking price|
|High season|Before midnight, 7 days before check-in|50% of total booking price|

#### Rules

- Season is determined by the **check-in date**, not the cancellation date.
- Breach fee applies **only when the user cancels**. Admin cancellations never trigger a fee.
- Breach fee is calculated against the total booking price **after any deals are applied**.
- Admin manually triggers the breach fee notification email — the system does not auto-charge.
- `cancellation_fee` and `fee_paid` are stored on the booking row. Admin records payment status manually.

---

### 2.4 Pricing & Season Rules

#### High Season Dates

|Period|Dates|
|---|---|
|Summer|15 June – 15 August|
|Christmas / New Year|20 December – 2 January|
|Easter|Palm Sunday (Easter Sunday − 7 days) through 2nd Easter day (Easter Sunday + 1 day)|

> **Easter is computed programmatically** using the Butcher algorithm at runtime. It is never hardcoded or admin-configured.

Everything outside these windows is low season.

#### Billing Model

- Price is calculated per **calendar day**. Both check-in and check-out days are billable.
- `billable_days = date_to - date_from + 1`
- Example: Friday arrival, Sunday departure = 3 billable days.
- **Minimum stay: 2 days.** `date_to` must be at least `date_from + 1`.
- Season is evaluated **per day**. A booking spanning a season boundary is billed at each day's applicable rate.
- Price is calculated and **stored at booking creation**. Admin can override it. Stored price is never recomputed from dates on read.

#### Rate Table (NOK per day)

|Cage type|Season|1 cat|2 cats|3 cats|
|---|---|---|---|---|
|`standard`|Low|220|320|—|
|`standard`|High|250|350|—|
|`senior_comfort`|Low|220|320|—|
|`senior_comfort`|High|250|350|—|
|`suite`|Low|350|350|400|
|`suite`|High|450|450|450|

> Suite pricing is flat for 1–2 cats. Only the 3-cat case changes the low season suite price.

#### 3-Cat Standard Split Pricing

When 3 cats are booked across two standard cages:

- Low season: 320 + 220 = **540 kr/day**
- High season: 350 + 250 = **600 kr/day**

---

### 2.5 Capacity & Cage Rules

#### Cage Inventory

|Type|Count|Max cats|Notes|
|---|---|---|---|
|`standard`|14|2|General purpose|
|`senior_comfort`|3|2|Older or special-needs cats|
|`suite`|3|3|Largest option|
|**Total**|**20**||6 of the 20 are designated outdoor positions|

> **Outdoor** is a physical position flag on a cage, not a cage type. Admin can designate any cage as outdoor. Outdoor designation does not affect pricing.

#### Valid Cage Options by Cat Count

|Cat count|Valid options|
|---|---|
|1–2 cats|`standard` ×1, `senior_comfort` ×1, or `suite` ×1|
|3 cats|`suite` ×1, or `standard` split ×2 (one 2-cat + one 1-cat)|

#### Occupancy Model

- Billing is inclusive: both check-in and check-out days are billable.
- Occupancy is exclusive of the departure day: a cage is occupied on every night in `[date_from, date_to)`.
- Same-day turnover is valid: a departing booking frees the cage on its `date_to` day for a new arrival.
- Billing and occupancy are two independent calculations — do not conflate them.

#### Availability Model

- Cage availability is driven by **cage assignments**, not booking status alone.
- A confirmed booking with no cage assignment yet does not block any specific physical cage.
- When a cat is reassigned from one cage to another mid-stay, the original cage becomes available for the reassigned date range immediately.
- Bookings in `pending`, `confirmed`, or `checked_in` status are considered when calculating overall capacity.
- `waitlisted`, `completed`, and `cancelled` bookings do not block availability.

#### Cage Assignment Conflict Rule

Two cage assignments conflict if:

```
assignment_A.date_from < assignment_B.date_to
AND
assignment_B.date_from < assignment_A.date_to
```

Same-day turnover passes cleanly — one's `date_to` equals the other's `date_from`.

#### Cat Conflict Rule

A specific cat cannot appear in two overlapping bookings:

```
booking_A.date_from < booking_B.date_to
AND
booking_B.date_from < booking_A.date_to
```

> **V2 requirement:** Both cat conflict and cage availability must be enforced **server-side via RPC** before insertion. V1 only enforced cat conflict server-side — cage availability was client-side only, creating a race condition.

---

### 2.6 Cage Split Scenarios

#### Scenario A — Mid-Stay Split

A booking's cats are moved to a different physical cage mid-stay. Booking dates unchanged. Two assignment records cover different date ranges within the same booking.

```
Booking: Mon → Fri
Assignment 1: Cage 3, Mon → Wed
Assignment 2: Cage 7, Wed → Fri
Cage 3 is free from Wed onward.
```

#### Scenario B — Same-Day Turnover

Two bookings share the same cage on the same calendar day. Cats from the departing booking roam freely while the cage is prepared.

```
Booking A: Cage 1, Fri → Sun  (departs Sunday)
Booking B: Cage 1, Sun → Tue  (arrives Sunday)
→ No conflict. date_A.date_to = date_B.date_from.
```

---

### 2.7 Deal & Discount Rules

#### Deal Structure

|Property|Options|
|---|---|
|Type|`percentage` (% off) or `fixed` (kr off)|
|Scope|`all_bookings` or `single_use`|
|Value|Numeric — percentage or kr amount|
|Active|Boolean — admin can disable without deleting|

#### Application Rules

- Deals are assigned to users by admin. Users cannot self-apply deals.
- A user can hold at most one active deal at a time.
- Deal applied **after** base price × billable days.
- Deal applied **before** breach fee calculation.
- `single_use` deals marked as used after `confirmed`. Not deactivated on `pending`.
- Percentage deals capped at 100%. Fixed deals cannot reduce total below 0 kr.

---

### 2.8 Staged Profile & Guest Flow Rules

#### Guest Booking Flow

1. Guest completes unauthenticated wizard: cat count → dates → cage → outdoor wish → summary.
2. On confirmation, inline login/register form shown.
3. If registering: account created, `terms_accepted = true`.
4. Email verification required before proceeding.
5. Guest completes inline profile form (all required fields — see 2.9).
6. `is_completed = true` on completion.
7. Auth booking wizard shown with pre-filled: dates, cage type, outdoor wish.
8. Cat count **not** pre-filled — guest selects from registered cats.
9. All selections revalidated server-side at submission.

#### Staged Profile Rules

- Guest who does not register saved as `staged` profile in `profiles`.
- `staged` profiles cannot log in.
- Same-email registration merges staged profile into authenticated account.
- Staged profiles retained indefinitely per NFR-106.

---

### 2.9 Profile Completion Rules

#### Required Fields

Profile is complete (`is_completed = true`) when all present:

- First name, Last name, Address, Phone number, Emergency phone number

#### Enforcement Gates

- **User portal:** Persistent prompt if `is_completed = false`.
- **Auth booking gate:** Blocked if `is_completed = false`. Inline form shown.
- `terms_accepted` must be `true` before any booking submission.

---

### 2.10 Waitlist & Offer Rules

- Booking enters `waitlisted` when any single night in range is fully booked at submission.
- Admin reviews manually — no obligation to promote in any order.
- Admin sends offer: proposed cage, proposed dates, optional note, configurable deadline.
- On **acceptance**: `confirmed`, admin notified, payment email sent to user.
- On **decline**: returns to `waitlisted`.
- On **deadline expiry**: returns to `waitlisted`, admin notified.

---

### 2.11 Roles & Permissions

|Action|User|Staff|Admin|
|---|---|---|---|
|View own bookings|✓|—|—|
|Create booking|✓|—|—|
|Cancel own booking|✓|—|—|
|View all bookings|—|✓|✓|
|View cat/booking info|—|✓|✓|
|Check-in / check-out|—|✓|✓|
|Assign cages|—|✓|✓|
|Approve / reject bookings|—|—|✓|
|Edit booking details|—|—|✓|
|Cancel any booking|—|—|✓|
|Manage waitlist / send offers|—|—|✓|
|Confirm payment|—|—|✓|
|Manage deals|—|—|✓|
|Manage users|—|—|✓|
|View changelog|—|—|✓|
|Export PDF documentation|—|—|✓|

---

### 2.12 Audit Log Rules

- Every mutation in the admin panel is logged to `audit_log`.
- Tracked entities: `booking`, `user`, `cat`, `deal`, `cage`, `payment`.
- Each entry records: actor ID, actor full name (snapshotted), action type, entity type, entity ID, before/after changes (JSONB), timestamp.
- Actor name is snapshotted at write time — log remains accurate if name later changes.
- Log is admin read-only. No edits or deletes permitted on `audit_log`.
- Staff mutations (check-in, check-out, cage assignment) are also logged.

---

### 2.13 Data Preservation & Snapshot Rules

#### Snapshot Strategy

A `booking_snapshots` record is created atomically at booking submission. It captures:

- Owner: name, email, phone, address
- Cats: name, gender, breed, age, microchip number (JSONB array)
- Snapshot timestamp

Write-once. Never updated. Represents state at transaction time for Bokføringsloven § 13.

#### Soft Delete & Retention Model

```
Main tables (profiles, cats, bookings)
  → Soft deleted via deleted_at timestamp
  → Hidden from application layer
  → Retained indefinitely

booking_snapshots
  → Never soft deleted
  → Admin-only read access
  → Eligible for purge after 5 years from snapshot_at
```

> Snapshot creation failure must **not** block booking submission. Log and alert admin. Never swallow silently.

#### Date Arithmetic Rule

> **Critical:** Never use `toISOString()`. Always construct `YYYY-MM-DD` from local date parts:
> 
> ```ts
> `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
> ```

---

## 3. Data Architecture & Domain Model

> ⚠️ Full schema definition is the next design session. Stubbed with known field inventory.

### Planned Tables

|Table|Purpose|
|---|---|
|`profiles`|User accounts, staff accounts, and staged guest profiles|
|`cats`|Cat records owned by profiles|
|`bookings`|Booking records with status, pricing, payment, and flags|
|`booking_cats`|Join table linking bookings to cats|
|`booking_snapshots`|Write-once compliance record per booking|
|`cage_assignments`|Physical cage allocation per booking, supports splits|
|`cages`|Physical cage inventory with type and outdoor flag|
|`deals`|Admin-created discount deals|
|`user_deals`|Join table assigning deals to users|
|`checkins`|Check-in checklist records per booking|
|`checkouts`|Check-out checklist records per booking|
|`audit_log`|Immutable record of all admin and staff mutations|

### Known Field Inventory

#### `profiles`

`id`, `email`, `role` (user | staff | admin), `first_name`, `last_name`, `address`, `phone`, `emergency_contact`, `notes`, `is_completed`, `terms_accepted`, `account_status` (staged | active), `deleted_at`, `created_at`

#### `cats`

`id`, `owner_id`, `name`, `gender`, `breed`, `age`, `is_sterilized`, `id_chip`, `insurance_number`, `last_vaccine_date`, `deworming_info`, `flea_treatment_info`, `medical_notes`, `diet`, `behavior_notes`, `gets_medication`, `medication_details`, `has_cat_experience`, `gets_along_with_cats`, `has_stress_issues`, `stress_details`, `aggression_risk`, `aggression_details`, `image_url`, `deleted_at`, `created_at`

#### `bookings`

`id`, `user_id`, `cage_type`, `cage_count`, `num_cats`, `date_from`, `date_to`, `price`, `status`, `payment_status` (unpaid | paid), `payment_confirmed_at`, `payment_confirmed_by`, `outdoor_cage_requested`, `waitlist_requested`, `special_instructions`, `cancellation_fee`, `fee_paid`, `deleted_at`, `created_at`

#### `booking_cats`

`booking_id`, `cat_id`

#### `booking_snapshots`

`id`, `booking_id`, `snapshot_at`, `owner_name`, `owner_email`, `owner_phone`, `owner_address`, `cats` (JSONB)

#### `cages`

`id`, `label`, `section`, `type` (standard | senior_comfort | suite), `is_outdoor`, `is_active`

#### `cage_assignments`

`id`, `booking_id`, `cage_id`, `cage_label`, `cage_section`, `date_from`, `date_to`, `notes`

#### `deals`

`id`, `name`, `type` (percentage | fixed), `scope` (all_bookings | single_use), `value`, `is_active`, `created_at`

#### `user_deals`

`id`, `user_id`, `deal_id`, `is_used`, `assigned_at`

#### `audit_log`

`id`, `actor_id`, `actor_name`, `action`, `entity_type`, `entity_id`, `changes` (JSONB), `created_at`

### RLS Strategy (stub — full policies in schema session)

|Table|User access|Staff access|Admin access|
|---|---|---|---|
|`profiles`|Read/update own row|Read own row|Read and update all|
|`cats`|Read/update own, `deleted_at IS NULL`|Read booking-related|Read all|
|`bookings`|Insert own, read own|Read all, update status only|Read and mutate all|
|`booking_snapshots`|None|None|Read only|
|`cage_assignments`|None|Read/insert/update|Full access|
|`cages`|Read (booking system)|Read|Full access|
|`deals` / `user_deals`|Read own active deal|None|Full access|
|`audit_log`|None|None|Read only|

---

## 4. Security Architecture

### 4.1 Defense in Depth Model

Every mutation passes through three independent security layers. No single layer is trusted alone.

```
Request
  │
  ▼
[1] Zod Schema Validation
    → Rejects malformed, missing, or out-of-range input
    → Runs on server action before any business logic
  │
  ▼
[2] Authentication & Authorization Check
    → Verifies caller via supabase.auth.getUser()
    → Verifies role permission for the operation
    → Admin operations check is_admin() RPC
    → Staff operations check is_staff() RPC
  │
  ▼
[3] Row Level Security (Supabase/PostgreSQL)
    → Database enforces ownership and role rules at query level
    → Last line of defense — must be correct even if layers 1–2 fail
  │
  ▼
Mutation executes
```

---

### 4.2 Input Validation & Sanitization (Zod)

#### Schema Location

All schemas in `src/schemas/` grouped by domain:

```
src/schemas/
  cat.schema.ts
  profile.schema.ts
  booking.schema.ts
  auth.schema.ts
  admin.schema.ts
```

> V1 had schemas split across `lib/validation/`, `schemas/`, and inline in components. V2 uses one location — no exceptions.

#### Input vs Output Types

```ts
type CatInput = z.input<typeof CatSchema>   // Before transforms — nulls allowed
type CatData  = z.output<typeof CatSchema>  // After transforms — clean types
```

Server actions always operate on the `output` type.

#### Sanitization Rules

- Strings `.trim()`ed.
- Empty optional strings transformed to `undefined`.
- Phone numbers validated against `/^\+?\d{7,15}$/`.
- Enums strict — no unrecognized values pass.

---

### 4.3 Authentication & Authorization

#### How Supabase Auth Works

- Passwords hashed with **bcrypt** server-side. Plain text never touches the app layer.
- Sessions managed via **JWT tokens** stored in cookies.
- Email verification via one-time token from Supabase.
- Password reset via one-time token with short expiry.

#### Session Verification

```ts
const { data: { user }, error } = await supabase.auth.getUser()
if (!user || error) redirect('/login')
```

> `getUser()` re-validates against Supabase Auth on every call. Cannot be spoofed by cookie manipulation.

#### Role Checks

```ts
const { data: isAdmin } = await supabase.rpc('is_admin')
if (!isAdmin) redirect('/')

const { data: isStaff } = await supabase.rpc('is_staff')
if (!isStaff) redirect('/')
```

#### Proxy Guard (proxy.ts)

`proxy.ts` protects route groups at the edge:

- `/admin/*` — redirects to `/` if role is not `admin`.
- `/staff/*` — redirects to `/` if role is not `staff` or `admin`.
- `/minside/*` — redirects to `/login` if no active session.
- `/booking/*` — no redirect; auth state handled in wizard UI.

> Note: `middleware.ts` is deprecated as of Next.js v16. The file convention is now `proxy.ts` with an exported `proxy` function. Run `npx @next/codemod@canary middleware-to-proxy .` to migrate.

---

### 4.4 Row Level Security

RLS policies enforced at PostgreSQL layer on every query. Service role client used for admin mutations — never exposed to the client.

---

### 4.5 File Upload Security

- **Allowed types:** image/jpeg, image/png, image/webp
- **Max size:** 4.4 MB
- MIME type re-validated server-side from file buffer.
- Files stored under `cat-images/{user_id}/{cat_id}`.
- Storage bucket private. Images served via signed URLs with expiry.

---

### 4.6 Data Exposure Rules

- `booking_snapshots` never returned to any client.
- `profiles.role` never returned to user client.
- Soft-deleted records filtered at RLS level, not application level.
- Price always read from stored `bookings.price` — never recomputed client-side.
- `audit_log` never exposed to users or staff.

---

## 5. File Architecture

### Conventions

|Rule|Reason|
|---|---|
|`src/server/` for all server actions|Single location, no ambiguity|
|`src/schemas/` for all Zod schemas|Prevents inline schema drift|
|`'use server'` only in `src/server/`|Never in component files|
|`'use client'` only in `src/components/`|Never in lib or server|
|kebab-case filenames|Consistent across all non-component files|
|Domain folders in `components/`|No flat root-level dumping|
|`lib/` contains zero DB calls|Pure logic — fully testable without Supabase|
|`proxy.ts` at root|Replaces deprecated `middleware.ts` (Next.js v16+)|

### Project Structure

```
mathopen-v2/
│
├── src/
│   │
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # Landing page
│   │   ├── globals.css
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── registrering/page.tsx
│   │   │   ├── registrering-bekreftet/page.tsx
│   │   │   ├── glemt-passord/page.tsx
│   │   │   ├── endre-passord/page.tsx
│   │   │   ├── confirm/route.ts
│   │   │   └── error/page.tsx
│   │   │
│   │   ├── admin/                            # Admin only (proxy guarded)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                      # Dashboard
│   │   │   ├── bookinger/page.tsx            # Bookings table
│   │   │   ├── tilbud/page.tsx               # offer_sent tracking + deadlines
│   │   │   ├── innsjekk/page.tsx             # Check-in / check-out (responsive)
│   │   │   ├── burplassering/page.tsx        # Physical cage assignment
│   │   │   ├── kalender/page.tsx             # Occupancy calendar / grid matrix
│   │   │   ├── sjekkliste/page.tsx           # Daily checklists
│   │   │   ├── avbestillinger/page.tsx       # Cancellations + fee tracking
│   │   │   ├── dokumentasjon/page.tsx        # PDF export (BookingPDFButton only)
│   │   │   ├── bur/page.tsx                  # Cage inventory + outdoor config
│   │   │   ├── deals/page.tsx                # Deal management
│   │   │   ├── brukere/page.tsx              # User management table
│   │   │   ├── endringslogg/page.tsx         # Audit log / changelog
│   │   │   └── hms/page.tsx
│   │   │
│   │   ├── staff/                            # Staff + admin (proxy guarded)
│   │   │   ├── layout.tsx
│   │   │   ├── bookinger/page.tsx            # Read-only booking table
│   │   │   ├── innsjekk/page.tsx             # Check-in / check-out (responsive)
│   │   │   └── burplassering/page.tsx        # Cage assignment
│   │   │
│   │   ├── minside/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── bookinger/page.tsx
│   │   │   ├── profil/page.tsx
│   │   │   └── minekatter/
│   │   │       ├── page.tsx
│   │   │       ├── legg-til/page.tsx         # 5-step cat wizard
│   │   │       └── [catId]/
│   │   │           ├── page.tsx
│   │   │           └── error.tsx
│   │   │
│   │   ├── booking/
│   │   │   ├── page.tsx
│   │   │   └── bekreftet/page.tsx
│   │   │
│   │   └── guider/
│   │       ├── page.tsx
│   │       └── [slug]/page.tsx
│   │
│   ├── server/                               # All server actions
│   │   ├── auth/
│   │   │   ├── sign-in.ts
│   │   │   ├── sign-up.ts
│   │   │   ├── sign-out.ts
│   │   │   ├── change-email.ts
│   │   │   ├── update-password.ts
│   │   │   └── forgot-password.ts
│   │   ├── cats/
│   │   │   ├── create-cat.ts
│   │   │   ├── update-cat.ts
│   │   │   ├── delete-cat.ts
│   │   │   ├── get-cat.ts
│   │   │   └── get-user-cats.ts
│   │   ├── bookings/
│   │   │   ├── create-booking.ts
│   │   │   ├── cancel-booking.ts
│   │   │   └── get-user-bookings.ts
│   │   ├── profiles/
│   │   │   ├── get-profile.ts
│   │   │   └── update-profile.ts
│   │   └── admin/
│   │       ├── bookings/
│   │       │   ├── get-all-bookings.ts
│   │       │   ├── update-booking-status.ts
│   │       │   ├── update-booking-details.ts
│   │       │   ├── cancel-booking.ts
│   │       │   ├── confirm-payment.ts
│   │       │   └── send-offer.ts
│   │       ├── cages/
│   │       │   ├── get-cages.ts
│   │       │   ├── update-cage.ts
│   │       │   ├── assign-cage.ts
│   │       │   ├── update-cage-assignment.ts
│   │       │   ├── delete-cage-assignment.ts
│   │       │   └── split-cage-assignment.ts
│   │       ├── deals/
│   │       │   ├── create-deal.ts
│   │       │   ├── update-deal.ts
│   │       │   └── assign-deal-to-user.ts
│   │       ├── checkins/
│   │       │   ├── upsert-checkin.ts
│   │       │   └── upsert-checkout.ts
│   │       ├── users/
│   │       │   └── get-all-users.ts
│   │       ├── audit/
│   │       │   └── get-audit-log.ts
│   │       ├── documents/
│   │       │   └── export-booking-pdf.ts
│   │       └── revenue/
│   │           └── get-revenue-stats.ts
│   │
│   ├── schemas/
│   │   ├── cat.schema.ts
│   │   ├── profile.schema.ts
│   │   ├── booking.schema.ts
│   │   ├── auth.schema.ts
│   │   └── admin.schema.ts
│   │
│   ├── components/
│   │   ├── ui/                              # shadcn/ui primitives (untouched)
│   │   │
│   │   ├── booking/
│   │   │   ├── booking-wizard.tsx
│   │   │   ├── guest-booking-wizard.tsx
│   │   │   ├── auth-booking-wizard.tsx
│   │   │   ├── steps/
│   │   │   │   ├── cat-count-step.tsx
│   │   │   │   ├── cat-selection-step.tsx
│   │   │   │   ├── date-range-step.tsx
│   │   │   │   ├── cage-selection-step.tsx
│   │   │   │   ├── outdoor-wish-step.tsx
│   │   │   │   ├── summary-step.tsx
│   │   │   │   └── auth-gate-step.tsx
│   │   │   └── shared/
│   │   │       ├── step-indicator.tsx
│   │   │       └── add-cat-dialog.tsx
│   │   │
│   │   ├── cats/
│   │   │   ├── add-cat-wizard.tsx           # 5-step wizard (replaces single form)
│   │   │   ├── update-cat-form.tsx
│   │   │   ├── cats-list.tsx
│   │   │   ├── delete-cat-button.tsx
│   │   │   ├── steps/
│   │   │   │   ├── basic-info-step.tsx
│   │   │   │   ├── id-insurance-step.tsx
│   │   │   │   ├── health-step.tsx
│   │   │   │   ├── daily-care-step.tsx
│   │   │   │   └── behavior-step.tsx
│   │   │   └── shared/
│   │   │       ├── yes-no-toggle.tsx
│   │   │       └── three-way-toggle.tsx
│   │   │
│   │   ├── profile/
│   │   │   └── profile-form.tsx
│   │   │
│   │   ├── user-bookings/
│   │   │   ├── booking-card.tsx
│   │   │   ├── booking-tabs.tsx
│   │   │   └── cancel-booking-dialog.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── nav/
│   │   │   │   └── admin-nav.tsx
│   │   │   ├── bookings/
│   │   │   │   ├── bookings-table.tsx
│   │   │   │   ├── booking-detail-sheet.tsx
│   │   │   │   └── booking-pdf-button.tsx   # BookingPDFButton only — no browser print
│   │   │   ├── offers/
│   │   │   │   └── offers-table.tsx
│   │   │   ├── cages/
│   │   │   │   ├── cage-grid.tsx
│   │   │   │   └── cage-assignment-form.tsx
│   │   │   ├── checkins/
│   │   │   │   ├── checkin-checkout-client.tsx  # Responsive — mobile + desktop
│   │   │   │   ├── checkin-form.tsx
│   │   │   │   └── checkin-pdf-button.tsx       # PDF download from checkin view
│   │   │   ├── checklists/
│   │   │   │   ├── daily-checklist.tsx
│   │   │   │   └── daily-routine-form.tsx
│   │   │   ├── deals/
│   │   │   │   └── deals-form.tsx
│   │   │   ├── users/
│   │   │   │   └── users-table.tsx
│   │   │   ├── audit/
│   │   │   │   └── audit-log-table.tsx
│   │   │   ├── documents/
│   │   │   │   ├── booking-pdf-document.tsx
│   │   │   │   └── bulk-export-panel.tsx
│   │   │   └── dashboard/
│   │   │       ├── stats-cards.tsx
│   │   │       ├── revenue-chart.tsx
│   │   │       └── dashboard-alerts.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── sign-up-form.tsx
│   │   │   ├── forgot-password-form.tsx
│   │   │   └── update-password-form.tsx
│   │   │
│   │   └── layout/
│   │       ├── navbar.tsx
│   │       ├── navbar-wrapper.tsx
│   │       ├── footer.tsx
│   │       ├── mobile-menu.tsx
│   │       └── admin-button.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── proxy.ts                     # Session refresh helper for proxy.ts
│   │   ├── booking/
│   │   │   ├── availability.ts
│   │   │   ├── pricing.ts
│   │   │   ├── cancellation.ts
│   │   │   └── wizard-storage.ts
│   │   ├── email/
│   │   │   ├── resend.ts
│   │   │   └── templates/
│   │   │       ├── booking.ts
│   │   │       ├── offer.ts
│   │   │       └── payment.ts               # Vipps payment instructions template
│   │   └── utils.ts
│   │
│   └── hooks/
│       └── use-cat-images.ts
│
├── proxy.ts                                 # Replaces middleware.ts (Next.js v16+)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json
├── package.json
└── .env.example
```

---

## 6. Behavioral Workflows

> ⚠️ Sequence diagrams to be completed after schema is confirmed.

### Stubbed Workflows

- [ ] Authenticated booking submission
- [ ] Guest booking → inline registration → auth booking handoff
- [ ] Admin approval + payment email flow
- [ ] Waitlist offer → accept / decline sequence
- [ ] Cat soft delete
- [ ] Cancellation + breach fee
- [ ] Check-in / check-out (admin and staff)
- [ ] Payment confirmation by admin

---

## 7. UI/UX Interface Specification

> To be completed after workflows are defined.

### Cat Add Wizard Steps (5 steps)

1. **Step 1 — Basic Info:** Name, age, breed, gender, image upload.
2. **Step 2 — ID & Insurance:** Microchip number, insurance number.
3. **Step 3 — Health:** Last vaccine date, deworming, flea treatment, medical notes.
4. **Step 4 — Daily Care:** Diet, behavior notes.
5. **Step 5 — Behavior:** Medication, cat experience, gets along with cats, stress issues, aggression risk.

### Booking Wizard — Guest Flow

1. **Step 1:** Cat count (1–2 for standard/senior_comfort, 1–3 for suite).
2. **Step 2:** Date picker — capacity check, fully booked days disabled. If any night is fully booked, booking will be submitted as `waitlisted` — shown clearly in summary.
3. **Step 3:** Cage type selection filtered by cat count and availability.
4. **Step 4:** Outdoor cage wish (boolean preference).
5. **Step 5:** Booking summary — waitlist status highlighted if applicable.
6. **Step 6:** Inline login / register. Email verification required.

### Booking Wizard — Auth Flow

1. **Step 1:** Select cats from registered cats (max 3). Inline cat add available.
2. **Step 2:** Date picker — same capacity logic. Waitlist status shown in summary if applicable.
3. **Step 3:** Cage type selection.
4. **Step 4:** Outdoor cage wish.
5. **Step 5:** Booking summary — framed as a request pending admin approval.

### PDF Export

- All PDF generation uses `@react-pdf/renderer` client-side via `BookingPDFButton`.
- Browser print (`window.print()`) is not used — removed due to preview and rendering issues in V1.
- PDF available from: booking detail view, check-in/check-out view, bulk export panel.

### Key Admin Layouts

- **Roster View:** Checked-in today, checking-out today, special care required.
- **Grid Matrix:** Physical cages (rows) × days of month (columns).
- **Offer Tracking View:** All `offer_sent` bookings with deadline countdowns.
- **User Management Table:** Sortable by first name, last name, email, phone.
- **Audit Log Table:** Filterable by entity type, actor, and date range.
- **Check-in / Check-out:** Fully responsive — desktop and mobile. Includes PDF download button.

---

## 8. Testing & CI/CD Strategy

### 8.1 Overview

Testing is written alongside each feature — not before the project, and not after. A feature is not considered done until it has appropriate test coverage. The testing strategy follows a two-layer model:

|Layer|Framework|Scope|
|---|---|---|
|Unit & Integration|Vitest + React Testing Library|Business logic, schemas, components|
|End-to-End|Playwright|Full user flows in a real browser|
|Automation|GitHub Actions|Triggered on every push and pull request|

---

### 8.2 Unit & Integration Testing — Vitest

#### Why Vitest

Vitest is the standard choice for modern Next.js projects. It uses the same ESM pipeline as the build toolchain, meaning TypeScript and module resolution work out of the box with zero extra configuration. It is significantly faster than Jest in watch mode and requires no transpilation plugins.

#### What Gets Tested

The highest-value unit tests are in `src/lib/` — pure functions with no UI and no Supabase dependency. These protect the business rules that, if broken, cause real financial or operational damage.

|File|What to test|
|---|---|
|`lib/booking/pricing.ts`|Every rate table combination — cage type, season, cat count, multi-day, season boundary splits|
|`lib/booking/cancellation.ts`|Low season vs high season notice windows, breach fee calculation, admin-cancel produces no fee|
|`lib/booking/availability.ts`|Cage conflict detection, same-day turnover passes, cat conflict detection|
|`src/schemas/*.ts`|Valid inputs pass, invalid inputs are rejected, edge cases for enums and phone regex|

#### Specific Test Cases Worth Having

Pricing:

- Standard 1 cat low season 3 days = 660 kr
- Suite 2 cats high season 2 days = 900 kr
- Booking spanning 14 June–16 June: 14 June is low, 15–16 June is high — mixed billing
- 3-cat standard split low season 1 day = 540 kr

Cancellation:

- Low season, cancellation 25 hours before midnight of check-in day → no fee
- Low season, cancellation 23 hours before midnight of check-in day → fee applies
- High season, cancellation 8 days before check-in → no fee
- High season, cancellation 6 days before check-in → fee applies
- Admin cancellation always → no fee regardless of timing

Availability:

- Two assignments with `A.date_to === B.date_from` → no conflict (same-day turnover)
- Two assignments with overlapping ranges → conflict detected
- Booking in `waitlisted` status → does not block capacity

Easter (Butcher algorithm):

- Known Easter dates for several years — assert the algorithm produces correct results

#### Setup

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
  },
})
```

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

#### File Conventions

Test files live next to the file they test:

```
src/lib/booking/
  pricing.ts
  pricing.test.ts
  availability.ts
  availability.test.ts
  cancellation.ts
  cancellation.test.ts

src/schemas/
  booking.schema.ts
  booking.schema.test.ts
```

#### Example

```ts
// src/lib/booking/pricing.test.ts
import { describe, it, expect } from 'vitest'
import { calculatePrice } from './pricing'

describe('calculatePrice', () => {
  it('standard 1 cat low season 3 days = 660 kr', () => {
    expect(calculatePrice({ cageType: 'standard', numCats: 1, dateFrom: '2026-03-01', dateTo: '2026-03-03' })).toBe(660)
  })

  it('splits billing correctly across a season boundary', () => {
    // 14 June (low) + 15 June (high) + 16 June (high) = 220 + 250 + 250
    expect(calculatePrice({ cageType: 'standard', numCats: 1, dateFrom: '2026-06-14', dateTo: '2026-06-16' })).toBe(720)
  })

  it('suite 1-2 cats same price in high season', () => {
    const one = calculatePrice({ cageType: 'suite', numCats: 1, dateFrom: '2026-07-01', dateTo: '2026-07-02' })
    const two = calculatePrice({ cageType: 'suite', numCats: 2, dateFrom: '2026-07-01', dateTo: '2026-07-02' })
    expect(one).toBe(two)
  })
})
```

---

### 8.3 End-to-End Testing — Playwright

#### Why Playwright

Playwright automates a real browser (Chromium, Firefox, WebKit) and tests the full application stack end-to-end — routing, auth, server actions, database, and UI all in one pass. It has native TypeScript support and is the current industry standard for E2E testing, having overtaken Cypress in adoption.

#### When to Write E2E Tests

E2E tests are written once a flow is stable — not while the UI is still being designed. Writing them against a moving interface creates maintenance overhead that is not worth the coverage.

#### What Gets Tested

|Flow|Why|
|---|---|
|Authenticated booking wizard — `pending` outcome|Core user journey|
|Authenticated booking wizard — `waitlisted` outcome|Critical edge case, affects user communication|
|Guest wizard → register → auth wizard handoff|Complex multi-step flow, highest regression risk|
|Admin approves booking, status changes to `confirmed`|Core admin operation|
|User cancels `confirmed` booking in breach window|Cancellation fee logic|
|Staff completes check-in, status changes to `checked_in`|Operational flow|
|Unauthenticated user cannot access `/minside`|Auth gate enforcement|
|Non-admin cannot access `/admin`|Role gate enforcement|

#### Setup

```bash
npm init playwright@latest
```

This generates `playwright.config.ts` and an `e2e/` folder at the project root.

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
})
```

#### File Conventions

```
e2e/
  booking-auth.spec.ts
  booking-guest.spec.ts
  admin-booking-approval.spec.ts
  auth-gates.spec.ts
  check-in-checkout.spec.ts
```

#### Example

```ts
// e2e/auth-gates.spec.ts
import { test, expect } from '@playwright/test'

test('unauthenticated user is redirected from /minside to /login', async ({ page }) => {
  await page.goto('/minside')
  await expect(page).toHaveURL('/login')
})

test('non-admin user is redirected from /admin to /', async ({ page }) => {
  // Log in as a regular user first
  await page.goto('/login')
  await page.fill('[name="email"]', 'user@test.com')
  await page.fill('[name="password"]', 'testpassword')
  await page.click('button[type="submit"]')
  await page.goto('/admin')
  await expect(page).toHaveURL('/')
})
```

---

### 8.4 CI/CD — GitHub Actions

#### What It Does

Every push to any branch and every pull request targeting `main` triggers an automated pipeline that installs dependencies and runs all tests in a clean environment. If any test fails, the pipeline reports a failure on the commit or PR. Nothing merges to `main` without passing tests.

This enforces the quality gate at a system level — it is not possible to accidentally ship broken business logic to production.

#### Workflow File

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Vitest
        run: npm run test:run

  e2e-tests:
    name: End-to-End Tests
    runs-on: ubuntu-latest
    needs: unit-tests   # Only run E2E if unit tests pass

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload Playwright report on failure
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

#### Environment Variables in CI

Supabase keys and other secrets are stored in GitHub repository settings under **Settings → Secrets and variables → Actions**. They are injected as environment variables at build time and never committed to the repository.

For E2E tests, a dedicated Supabase test project is used — not the production instance. This prevents test runs from writing to or reading from live data.

#### Vercel Integration

Vercel deploys automatically on every push to `main`. Combined with the GitHub Actions pipeline, the full flow is:

```
Developer pushes to main
        ↓
GitHub Actions: Vitest → pass
GitHub Actions: Playwright → pass
        ↓
Vercel: build and deploy to production
```

If either test job fails, Vercel can be configured to block the deployment via the Vercel GitHub integration settings.

---

### 8.5 When to Write What

|Phase|What to write|When|
|---|---|---|
|Phase 2 — Business logic|Vitest tests for `pricing.ts`, `availability.ts`, `cancellation.ts`|Immediately when each function is written|
|Phase 2 — Schemas|Vitest tests for all Zod schemas|Immediately when each schema is defined|
|Phase 2|Set up Vitest config and `test:run` script|Start of Phase 2|
|Phase 3 — Booking wizard|Playwright E2E for booking flows|After wizard UI is stable|
|Phase 3 — Auth|Playwright E2E for auth gates and redirects|After proxy.ts is in place|
|Phase 4 — Admin|Playwright E2E for approval and check-in flows|After admin panel is stable|
|Phase 5|GitHub Actions CI workflow|Once meaningful Vitest tests exist|
|Phase 5|Add Playwright job to CI|Once E2E suite has 3+ stable tests|

---

### 8.6 File Structure Additions

The following additions to the project structure support the testing strategy:

```
mathopen-v2/
│
├── e2e/                                     # Playwright E2E tests
│   ├── booking-auth.spec.ts
│   ├── booking-guest.spec.ts
│   ├── admin-booking-approval.spec.ts
│   ├── auth-gates.spec.ts
│   └── check-in-checkout.spec.ts
│
├── src/
│   └── lib/
│       └── booking/
│           ├── pricing.ts
│           ├── pricing.test.ts              # Colocated unit tests
│           ├── availability.ts
│           ├── availability.test.ts
│           ├── cancellation.ts
│           └── cancellation.test.ts
│
├── .github/
│   └── workflows/
│       └── ci.yml                           # GitHub Actions pipeline
│
├── playwright.config.ts
└── vitest.config.mts
```

---

## 9. Migration Plan

### 9.1 Overview

V1 and V2 are separate Supabase projects within the same Supabase account. Migration is performed once, before V2 goes live. V1 remains read-only during migration.

### 9.2 Migration Order

Dependencies must be respected. Migrate in this exact sequence:

```
1. cages              ← seed V2 cage inventory first (new table, no V1 equivalent)
2. auth.users         ← bcrypt hashes and UUIDs preserved intact
3. profiles           ← depends on auth.users
4. cats               ← depends on profiles
5. bookings           ← depends on profiles + cats
6. booking_cats       ← depends on bookings + cats
7. booking_snapshots  ← depends on bookings
8. cage_assignments   ← depends on bookings + cages
9. deals / user_deals ← independent, migrate after profiles
```

### 9.3 Auth User Transfer

Supabase CLI preserves bcrypt password hashes and UUIDs:

```bash
# Export from V1
supabase db dump --project-ref <v1-ref> --data-only -t auth.users > auth-users.sql

# Import to V2
supabase db push --project-ref <v2-ref> < auth-users.sql
```

- Passwords carry over — users do not need to reset.
- UUIDs are identical — all FK relationships remain valid.

### 9.4 Default Values for New Columns

|New V2 column|Migration default|Handling|
|---|---|---|
|`profiles.role`|`user`|Safe default for all migrated users|
|`profiles.account_status`|`active`|All V1 users were active|
|`bookings.payment_status`|`paid`|V1 bookings are assumed already paid|
|`bookings.payment_confirmed_at`|`created_at` value|Approximate — no exact V1 record|
|`bookings.payment_confirmed_by`|`null`|No V1 record of who confirmed|
|`audit_log`|Empty|Log starts fresh in V2|
|`deals` / `user_deals`|Empty|No V1 equivalent|

### 9.5 Incomplete Profile Handling

V2 adds no new required profile fields beyond what V1 collected. All migrated users will have `is_completed = true` if their V1 profile was complete.

If any migrated user has missing required fields, `is_completed` is set to `false` and the existing profile completion gate handles it — persistent prompt in user portal, blocked at booking gate. No custom migration UI needed.

### 9.6 Post-Migration Validation Checklist

- [ ] Auth user count matches between V1 and V2
- [ ] Spot-check 5 profiles — fields match V1
- [ ] Spot-check 5 bookings — status, price, dates match V1
- [ ] Spot-check 3 booking_snapshots — JSONB data intact
- [ ] All cage_assignments reference valid cage IDs in new `cages` table
- [ ] RLS policies tested — user cannot read another user's data
- [ ] Admin login confirmed working
- [ ] Staff login confirmed working
- [ ] Booking submission end-to-end test in V2
