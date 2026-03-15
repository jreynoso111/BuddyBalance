# Buddy Balance Release & Security Review

## Executive summary

The code and release blockers identified in the last review have now been corrected in the repo and database, with one remaining external security setting still pending in Supabase Auth.

Current status:

- `npm run typecheck`: passed
- `npm run doctor`: passed
- `npm run export:prod`: passed
- Supabase security advisor: only one remaining warning

## Resolved items

### RES-001 - Admin password reset deep link aligned

- Updated `/Users/jreynoso/I Got You/supabase/functions/admin-user-management/index.ts`
- The fallback reset redirect now uses `buddybalance://reset-password` instead of the obsolete `igotyou://reset-password`.

### RES-002 - Expo notifications plugin added for release builds

- Updated `/Users/jreynoso/I Got You/app.json`
- The app config now includes `expo-notifications`, which reduces native iOS notification drift risk for release builds.

### RES-003 - Biometric lock is now enforced

- Added `/Users/jreynoso/I Got You/components/AppBiometricGate.tsx`
- Added `/Users/jreynoso/I Got You/services/appLock.ts`
- Updated `/Users/jreynoso/I Got You/app/_layout.tsx`
- Updated `/Users/jreynoso/I Got You/app/security.tsx`

The app now:

- reads biometric preference per user
- enforces unlock on app entry for users with biometric lock enabled
- re-locks on foreground return
- allows retry or sign-out from the lock screen

### RES-004 - Database function hardening applied

- Added `/Users/jreynoso/I Got You/supabase/migrations/20260308165702_fix_function_search_paths.sql`
- Applied migration successfully to Supabase

The prior `function_search_path_mutable` warnings for `public.handle_updated_at` and `public.update_loan_status_on_payment` are no longer present in the security advisor.

### RES-005 - Client-side password policy strengthened

- Added `/Users/jreynoso/I Got You/services/passwordPolicy.ts`
- Updated:
  - `/Users/jreynoso/I Got You/app/(auth)/register.tsx`
  - `/Users/jreynoso/I Got You/app/(auth)/reset-password.tsx`
  - `/Users/jreynoso/I Got You/app/security.tsx`

Passwords now require at least 10 characters with uppercase, lowercase, and a number.

## Remaining item

### REM-001 - Supabase leaked-password protection is still disabled

- Source: Supabase security advisor
- Status: not configurable from this repo
- Required action: enable leaked-password protection in Supabase Auth settings
- Reference: [Supabase password security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## Recommendation

The codebase is now in substantially better shape for release. I would not treat it as fully ready until `REM-001` is enabled in Supabase Auth and one final physical-device iPhone pass is completed for:

- biometric unlock at cold start
- biometric unlock after background resume
- forgot password
- admin-triggered password reset
- notifications permission and delivery behavior

## Audit addendum - 2026-03-14 21:34:33 EDT

### Executive summary

The original finding has been corrected. The web password login flow now renders Cloudflare Turnstile in the browser and routes password sign-in through a repo-controlled public auth function that validates the token server-side before establishing a session.

### Resolved high severity findings

#### AUD-001 - Web password sign-in bypassed Turnstile entirely (resolved)

- Location:
  - `/Users/jreynoso/I Got You/app/(auth)/login.tsx`
  - `/Users/jreynoso/I Got You/services/publicAuth.ts`
  - `/Users/jreynoso/I Got You/supabase/functions/public-auth/index.ts`
- Evidence:
  - The web login screen now requires Turnstile before enabling password sign-in.
  - Password sign-in is routed through `public-auth` and validated with expected Turnstile action `public_sign_in`.
- Impact:
  - The prior unauthenticated password sign-in gap is closed for the website password flow.
- Fix:
  - Implemented. The repo now uses a dedicated public sign-in action that validates Turnstile before attempting password authentication.

### Medium severity findings

#### AUD-002 - Public rate limiting is process-local and can be bypassed across instances

- Location:
  - `/Users/jreynoso/I Got You/supabase/functions/_shared/public-security.ts:6`
  - `/Users/jreynoso/I Got You/supabase/functions/_shared/public-security.ts:73`
- Evidence:
  - Public rate limiting is implemented with an in-memory `Map`.
- Impact:
  - This provides only best-effort throttling inside a single warm function instance. It does not give strong distributed protection under horizontal scale, cold starts, or multi-region traffic.
- Fix:
  - Move rate limiting to a shared backend store or edge-native control plane.

### Verified protected flows

- `login` web password sign-in now requires Turnstile in frontend and validates it server-side through `public-auth`
- `register` web requires Turnstile before requesting or resending the email code:
  - `/Users/jreynoso/I Got You/app/(auth)/register.tsx:128`
  - `/Users/jreynoso/I Got You/app/(auth)/register.tsx:352`
- `forgot-password` web requires Turnstile before sending the reset link:
  - `/Users/jreynoso/I Got You/app/(auth)/forgot-password.tsx:39`
  - `/Users/jreynoso/I Got You/app/(auth)/forgot-password.tsx:93`
- `contact` requires Turnstile in frontend and validates it server-side:
  - `/Users/jreynoso/I Got You/components/support/PublicContactForm.tsx:80`
  - `/Users/jreynoso/I Got You/supabase/functions/public-contact/index.ts:133`
  - `/Users/jreynoso/I Got You/supabase/functions/public-contact/index.ts:157`

## Audit addendum - 2026-03-15 00:37:46 EDT

### Executive summary

The public auth hardening work is materially better than before: distributed rate limiting is now implemented through Supabase, Turnstile-backed public flows are protected server-side, and `revenuecat-sync` now fails closed until its webhook secret is configured.

No new critical findings were identified in the public auth flows during this pass. The remaining gaps are mostly deployment-level browser hardening and one Supabase Auth control that still requires dashboard configuration outside this repo.

### Medium severity findings

#### AUD-003 - Production web responses still ship without visible browser hardening headers

- Location:
  - `/Users/jreynoso/I Got You/vercel.json`
  - `/Users/jreynoso/I Got You/app/+html.tsx:10`
- Evidence:
  - The repo has no configured response headers in `vercel.json`.
  - On March 15, 2026, `curl -I https://buddybalance.net/login` returned no visible `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, or frame restriction header.
- Impact:
  - Any future XSS bug would have a larger blast radius, clickjacking protections are not visible, and browser-side defense in depth is weaker than it should be for auth pages.
- Fix:
  - Add response headers at the hosting layer, preferably in `vercel.json` or equivalent deployment config. At minimum, define CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a frame restriction strategy (`frame-ancestors` in CSP or `X-Frame-Options` where appropriate).
- False positive notes:
  - If these headers are injected by an upstream CDN or another environment-specific control not present in this repo, verify them again in production after that layer.

### Low severity findings

#### AUD-004 - Supabase advisor still reports `friend_merge_key` with mutable search path

- Location:
  - Supabase database object `public.friend_merge_key(uuid,uuid)` (not currently defined in a repo migration file)
- Evidence:
  - Supabase Security Advisor still reports `function_search_path_mutable` for `public.friend_merge_key`.
  - Current database definition does not include `SET search_path = ''`.
- Impact:
  - Practical exploitability appears low because this function is `IMMUTABLE` and only compares UUID text values, but it still violates the same hardening rule already applied to other functions in this project.
- Fix:
  - Add a new migration that recreates `public.friend_merge_key(uuid,uuid)` with an explicit immutable search path.

### Remaining external item

#### AUD-005 - Supabase leaked-password protection is still disabled

- Location:
  - Supabase Auth dashboard setting, not configurable from the repo
- Evidence:
  - Supabase Security Advisor continues to report `auth_leaked_password_protection`.
- Impact:
  - Users can still choose passwords known to be compromised in public breaches.
- Fix:
  - Enable leaked-password protection in Supabase Auth settings:
    - https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### Resolved during this pass

#### RES-006 - Public rate limiting is no longer worker-local

- Updated:
  - `/Users/jreynoso/I Got You/supabase/migrations/20260314230000_add_public_rate_limit_rpc.sql`
  - `/Users/jreynoso/I Got You/supabase/functions/_shared/public-security.ts`
  - `/Users/jreynoso/I Got You/supabase/functions/public-auth/index.ts`
  - `/Users/jreynoso/I Got You/supabase/functions/public-contact/index.ts`
- Result:
  - Public rate limiting now persists in Supabase instead of relying on an in-memory `Map`.

#### RES-007 - RevenueCat sync now fails closed until configured

- Updated:
  - `/Users/jreynoso/I Got You/supabase/functions/revenuecat-sync/index.ts`
  - `/Users/jreynoso/I Got You/README.md`
  - `/Users/jreynoso/I Got You/.env.example`
- Result:
  - `revenuecat-sync` now rejects unauthenticated webhook-style requests when `REVENUECAT_WEBHOOK_AUTH_TOKEN` is missing instead of accepting arbitrary request bodies.
