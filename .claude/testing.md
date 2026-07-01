# Testing

Loaded on demand. Reference from AGENTS.md with `.claude/testing.md`.

---

## Setup

```bash
# Vitest
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths

# Playwright
npm init playwright@latest
```

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: { environment: 'jsdom' },
})
```

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
  use: { baseURL: 'http://localhost:3000' },
})
```

---

## File Layout

```
src/lib/booking/
  pricing.ts          pricing.test.ts       ← colocated
  availability.ts     availability.test.ts
  cancellation.ts     cancellation.test.ts
src/schemas/
  booking.schema.ts   booking.schema.test.ts

e2e/
  booking-auth.spec.ts
  booking-guest.spec.ts
  admin-booking-approval.spec.ts
  auth-gates.spec.ts
  check-in-checkout.spec.ts
```

---

## Required Test Cases

### Pricing (`pricing.test.ts`)
- Standard 1 cat low season 3 days → 660 kr
- Suite 2 cats high season 2 days → 900 kr
- Standard 1 cat, 14 Jun–16 Jun: 14 Jun low (220) + 15 Jun high (250) + 16 Jun high (250) → 720 kr
- 3-cat standard split low season 1 day → 540 kr
- Suite 1 cat = suite 2 cats (same price) in high season
- Easter boundary computed correctly for 3+ known years

### Cancellation (`cancellation.test.ts`)
- Low season, 25 hours before midnight → no fee
- Low season, 23 hours before midnight → fee applies
- High season, 8 days before check-in → no fee
- High season, 6 days before check-in → fee applies
- Admin cancellation → no fee regardless of timing

### Availability (`availability.test.ts`)
- `A.date_to === B.date_from` → no conflict (same-day turnover)
- Overlapping ranges → conflict detected
- `waitlisted` booking → does not block capacity

---

## CI Workflow (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run test:run

  e2e-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

E2E tests use a dedicated Supabase test project — never production.
Secrets in GitHub → Settings → Secrets and variables → Actions.
