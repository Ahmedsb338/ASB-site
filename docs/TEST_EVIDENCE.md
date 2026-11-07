# Web test evidence (2026-11-07T12:03:26Z)
## node --test
# tests 7
# pass 7
# fail 0
## Playwright e2e (Chromium; dist built; _headers CSP applied per path; Supabase mocked)
PASS - root shows the landing page (no blind redirect) and links to /app and /download
PASS - /app entry page renders with open-app deep link + download link
PASS - reset-password: valid recovery link -> weak/mismatch rejected -> success PUT with bearer + apikey; hash cleared
PASS - reset-password: expired link (error fragment) and revoked token (401) show expired; no form
PASS - reset-password: no link / PKCE code / signup token never show the form
PASS - auth/callback: recovery and invite forward to /reset-password with fragment
PASS - auth/callback: signup + email_change confirmed, pending leg, expired error, bad link; tokens discarded, no network
PASS - download: offers valid build, hides expired build
PASS - Arabic toggle sets RTL; no horizontal scroll at 320px
PASS - well-known files served as JSON and parse
## Production build
WARN: Android assetlinks: ANDROID_PACKAGE / ANDROID_SHA256_FINGERPRINTS not provided (empty file written)
WARN: iOS AASA: IOS_APP_IDS not provided (empty file written)
built -> /home/claude/work/web/dist
## NOT TESTED: live Cloudflare Pages deploy, DNS, real Supabase emails, App Links verification (no fingerprint / Team ID)
