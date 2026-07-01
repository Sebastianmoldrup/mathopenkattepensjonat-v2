# Code Patterns

Loaded on demand. Reference from AGENTS.md with `.claude/patterns.md`.

---

## Server Action Pattern

Every server action in `src/server/` follows this structure exactly:

```ts
'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { SomeSchema } from '@/schemas/some.schema'

export async function someAction(input: z.input<typeof SomeSchema>) {
  // Layer 1 — Zod
  const parsed = SomeSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // Layer 2 — Auth
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Admin actions: const { data: isAdmin } = await supabase.rpc('is_admin')
  // Staff actions: const { data: isStaff } = await supabase.rpc('is_staff')

  // Layer 3 — RLS enforced by DB
  const { data, error } = await supabase.from('table').insert(parsed.data)
  if (error) return { error: error.message }

  return { data }
}
```

---

## Zod Schema Conventions

```ts
// Always distinguish input vs output types
type CatInput = z.input<typeof CatSchema>   // pre-transform, nulls allowed
type CatData  = z.output<typeof CatSchema>  // post-transform, clean types

// Server actions always operate on z.output types
```

Sanitization: strings `.trim()`ed · empty optionals → `undefined` · phone `/^\+?\d{7,15}$/` · enums strict.

---

## Supabase Client Usage

| Context | Client | Import |
|---|---|---|
| Server actions, RSC | Server client | `@/lib/supabase/server` |
| Client components | Browser client | `@/lib/supabase/client` |
| Admin mutations | Service role | Never expose to client |

Always use `supabase.auth.getUser()` — re-validates every call. Never trust cached session state.

---

## Audit Log Pattern

Every admin and staff mutation must produce an entry:

```ts
await supabase.from('audit_log').insert({
  actor_id: user.id,
  actor_name: `${profile.first_name} ${profile.last_name}`, // snapshot at write time
  action: 'booking.status_update',
  entity_type: 'booking',
  entity_id: bookingId,
  changes: { before: { status: prev }, after: { status: next } },
})
```

Actor name is snapshotted — the log stays accurate if the name later changes.

---

## Date Utility

```ts
// ✅ Required pattern
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ❌ Never — breaks at UTC boundary
d.toISOString().split('T')[0]
```

---

## Booking Snapshot Pattern

Created atomically at booking submission. Write-once, never updated.

```ts
await supabase.from('booking_snapshots').insert({
  booking_id: booking.id,
  snapshot_at: new Date().toISOString(),
  owner_name: `${profile.first_name} ${profile.last_name}`,
  owner_email: profile.email,
  owner_phone: profile.phone,
  owner_address: profile.address,
  cats: catsData, // JSONB array
})
// Failure must NOT block booking submission — log and alert admin
```
