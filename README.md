# ASB Workforce – Official website (static, Cloudflare Pages)

Independent from the mobile app; zero runtime dependencies (plain HTML/CSS/JS, Node only for the build script).

| Route | Purpose |
|---|---|
| `/` | Company landing page (existing approved content, EN/AR; adds Open-app + Download links) |
| `/app` | Application entry: open the installed app (`asbworkforce://`) or download it |
| `/reset-password` | Set/reset password from Supabase recovery/invite links (fragment tokens → `GET/PUT /auth/v1/user`) |
| `/auth/callback` | Auth callback: forwards recovery/invite to `/reset-password`; confirms signup/email-change; handles expired/invalid links; hands PKCE codes to the app |
| `/download` | Android download (from `latest.json`) |

Security: strict per-path CSP (no inline script on auth pages; connect-src only this project's Supabase), `no-store`, `no-referrer`, tokens removed from the address bar immediately, tokens never logged/stored, no third-party scripts on auth pages, publishable key only.

```
cp .env.example .env     # public values only
npm run build            # -> dist/
npm test                 # unit tests (node:test)
npm run e2e              # Playwright e2e (needs Playwright installed globally; PLAYWRIGHT_PATH optional)
```
Deployment settings, DNS and Supabase checklist: `docs/DEPLOY.md`, `docs/SUPABASE_AUTH_CHECKLIST.md`.
