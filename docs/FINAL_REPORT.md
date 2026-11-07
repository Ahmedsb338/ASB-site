# ASB Workforce – Final Report (2026-11-07)
Statuses: PASS · CONDITIONAL PASS · BLOCKED · NOT TESTED · NOT AUTHORIZED. Nothing was pushed or deployed; no DNS, Cloudflare, Supabase settings, schema, data, RLS, functions or secrets were changed. Production was only READ (advisors, function/policy catalog queries, Edge Function source).

## 1. Passkeys
| Item | Status | Evidence |
|---|---|---|
| Server flow verified from source (single-use proof, 2-min expiry, operation + business-date binding, challenge deleted under row lock, counter `greatest`, UV required) | PASS | `consume_passkey_authentication`, `consume_attendance_passkey_proof`, `verify-passkey` read |
| Mobile attendance wired to the existing functions (no fallback, disabled until a verified native module is registered) | PASS (mocks) | 12 tests: passkeyFlow 6, passkey module 3, enable script 3 |
| `react-native-passkey` integrated / installed / API verified | **BLOCKED** | registry unreachable; install impossible; docs read: `isSupported()`, `get()`; response fields undocumented – `enable-passkeys` refuses unless the installed package exposes them |
| Android origin (`android:apk-key-hash`) | **BLOCKED – needs approval** | exact allow-list edit prepared (`proposals/edge-functions/passkey-origins.md`); no wildcard |
| assetlinks / AASA with real fingerprint / Team ID | **BLOCKED** | no signing SHA-256 obtainable (EAS connector exposes no keystore); EAS account has **no iOS build**, so no Team ID; generator ready & tested |
| 10 production passkeys + web flow preserved | PASS | RP ID unchanged by design; nothing deployed |
| RP-ID host | **BLOCKED** | secret not readable; owner must confirm `WEBAUTHN_RP_ID` (association files must live on that host) |
| Real-device registration/authentication | NOT TESTED | no device/build possible here |

## 2. Official domain `https://asbworkforce.online`
Website routes `/ /app /reset-password /auth/callback /download` built, tested (PASS); app has App Link/Universal Link config (`app.json`), `/auth/callback`, `/app`, https-host trust; reset emails can use the https URL via `EXPO_PUBLIC_AUTH_LINK_MODE=https` (default stays `asbworkforce://` until the dashboard allow-list is live). **Supabase Dashboard – BLOCKED (no access), not changed.** Exact values to apply: Site URL `https://asbworkforce.online`; add `https://asbworkforce.online/**`, `asbworkforce://reset-password`, `asbworkforce://**`; keep all existing (`docs/SUPABASE_AUTH_CHECKLIST.md`). Passkey RP-ID compatibility strategy: keep RP ID, allow-list origins, host association on RP-ID host.

## 3. Production app configuration
Package/bundle id `com.asb.workforce.dev` kept – **owner decision required** (changing it creates a different app; association files/passkeys bind to it). Fixed: `eas.json` production profile had no Supabase env. Password-reset / invite / email-confirmation / email-change / PKCE-hand-off flows: code + unit + browser tests PASS (mocked); live email delivery NOT TESTED. Login/logout/session code unchanged except an opt-in flag branch (`EXPO_PUBLIC_LOGIN_MODE`, default off).

## 4. Security (details: mobile `docs/SECURITY_FINDINGS.md`)
1. **Email disclosure via Staff ID: CONFIRMED**; on a scratch Postgres 16 the original harvested 100/100 emails/min under header spoofing, hardened 001 → 20, 002 revokes anon. Fix prepared: `staff-auth` Edge Function (14 tests) + client flag + SQL 001/002 + rollback. **Awaiting your approval to deploy/apply** (order in `proposals/README.md`).
2. 41 (50) SECURITY DEFINER functions: all have fixed `search_path`; 18 bodies read in full/head – tenant isolation PASS; the rest checked by static flags → **CONDITIONAL PASS** (cross-tenant negative tests still to run).
3. `send-reminders` JWT-off: LOW; secret + Vault + cron verified; minor error-detail leak proposed.
4. Extensions: keep `pg_net` (not relocatable, used by cron); `btree_gist` move proposed (tested on scratch DB).
5. RLS: PASS (RLS on all 31 tables, restrictive deny policies on 8 internal tables, no anon table grants).
Remaining: leaked-password protection (dashboard, BLOCKED), passkey/registration hardening items, `create-user` https redirect.

## 5. Build & test evidence
| Check | Status |
|---|---|
| Mobile unit/integration tests (`bun test`) | **PASS 36/36** |
| Web unit tests (`node --test`) | **PASS 7/7** |
| Web browser e2e (Chromium, per-path CSP, mocked Supabase) | **PASS 10/10** |
| Website production build (+strict mode, secret refusal) | **PASS** |
| SQL proposals on scratch Postgres 16 | PASS (001, 002, rollback, 003) |
| Android/iOS config validation (`app.json`, `eas.json`, association generator) | PASS as static tests; on-device/store verification NOT TESTED |
| Mobile TypeScript typecheck / lint / expo-doctor | **BLOCKED** – `Could not resolve host: registry.npmjs.org`; `npm ci --offline` → `ENOTCACHED yocto-queue` |
| Mobile production build (EAS/APK) | **BLOCKED** (same; EAS build also needs your account/approval) |

## 6. Manual actions still required
**Supabase:** Auth URL settings above; leaked-password protection; approve & apply `proposals/` items 1–8 in order; set `WEBAUTHN_ANDROID_ORIGINS`; confirm `WEBAUTHN_RP_ID/ORIGIN/APP_ORIGIN`.
**Cloudflare:** Pages project (build `node scripts/build.mjs --strict`, output `dist`, env vars in `.env.example`), custom domain + www redirect (`docs/DEPLOY.md`); publish association files on the RP-ID host.
**You/dev machine:** `npm install` → `npx tsc --noEmit` → `npx expo lint` → `npx expo-doctor` → `bun test`; `npx expo install react-native-passkey` → `npm run enable-passkeys` → development build → device tests; provide Android signing SHA-256 (`eas credentials`), Apple Team ID, final package/bundle id.
**Unresolved blockers:** package registry access in this environment; signing fingerprint; Apple Team ID / iOS build; production id decision; RP-ID value; dashboard access; approvals for production changes.
