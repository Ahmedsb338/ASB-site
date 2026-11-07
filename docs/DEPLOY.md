# Cloudflare Pages deployment – settings to apply MANUALLY (nothing was deployed or changed)

## Pages project
| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `node scripts/build.mjs --strict` |
| Build output directory | `dist` |
| Root directory | `/` (this folder) |
| Node version | 22 (env `NODE_VERSION=22`) |
| Environment variables (production) | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (public), `ANDROID_PACKAGE`, `ANDROID_SHA256_FINGERPRINTS`, `IOS_APP_IDS` – see `.env.example`. `--strict` fails the build until the Android fingerprint and iOS app id are supplied (they are BLOCKED/never guessed). Use the non-strict `node scripts/build.mjs` to deploy without app-link verification. |

## Domain and DNS (`asbworkforce.online`)
The registrar/DNS host is not stated in the supplied material, so exact records depend on it:
1. **DNS on Cloudflare (recommended):** Pages project → Custom domains → add `asbworkforce.online` (and `www.asbworkforce.online`). Cloudflare creates the proxied apex record (CNAME flattening to `<project>.pages.dev`) and `www` CNAME automatically; confirm TLS shows Active.
2. **DNS elsewhere:** apex CNAME/ALIAS to `<project>.pages.dev` (only if the host supports CNAME flattening/ALIAS), `www CNAME <project>.pages.dev`; otherwise move nameservers to Cloudflare.
3. Add a redirect `www` → apex (Cloudflare Redirect Rule) – the root must keep serving the landing page, not the app.
4. Do not leave conflicting A/AAAA/CNAME records for the apex. Keep any existing MX/TXT (email) records untouched.

## Routes provided
`/` landing · `/app` entry (opens `asbworkforce://`, links to download) · `/reset-password` · `/auth/callback` · `/download` · `/.well-known/assetlinks.json` · `/.well-known/apple-app-site-association` (served as JSON via `_headers`).
Cloudflare Pages serves `/x` → `/x/` (index.html) automatically; no catch-all redirect exists, so the root is never redirected to the app.

## Android App Links / iOS Universal Links requirements (BLOCKED inputs)
- `ANDROID_SHA256_FINGERPRINTS`: SHA-256 of the **signing** certificate (`eas credentials`); play-signed apps also need the Play App Signing fingerprint.
- `IOS_APP_IDS`: `<Apple Team ID>.<bundle id>`.
- Remember the passkey RP-ID caveat in the mobile `docs/PASSKEY_MOBILE.md` (association for passkeys must be on the RP-ID domain).
- Verify after deploy: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://asbworkforce.online&relation=delegate_permission/common.handle_all_urls` and `adb shell pm get-app-links com.asb.workforce.dev`.

## Release download page
`/download` reads `/latest.json` (written by `scripts/update-latest.sh` after each EAS build) and only offers non-expired `https://expo.dev/` links.

## Passkeys note (important)
Passkey association files must be served on the **WebAuthn RP-ID host**, which is whatever `WEBAUTHN_RP_ID`/`WEBAUTHN_ORIGIN` is set to in the Edge Function secrets (code default `quantechattendance.pages.dev`), NOT necessarily `asbworkforce.online`. Changing the RP ID would invalidate every registered passkey. Publish the generated `assetlinks.json` / `apple-app-site-association` on the RP-ID host too. See the mobile project's `docs/PASSKEY_MOBILE.md`.
