# Supabase Auth configuration – to be applied MANUALLY by the owner (NOT applied; no dashboard access)
Project: **ASB-Workforce Project**, ref `lwbyjnzpmtlflhsywtcw` (eu-central-1) – the only project on the connected account.
Dashboard → Authentication → URL Configuration

| Setting | Value | Action |
|---|---|---|
| Site URL | `https://asbworkforce.online` | set |
| Additional Redirect URLs | `https://asbworkforce.online/**` | **add** |
| | `asbworkforce://reset-password` | **add** |
| | `asbworkforce://**` | **add** |
| Existing URLs (e.g. legacy `quantechattendance.pages.dev` if the web attendance app still uses it) | – | **keep**, delete nothing without approval |

Also: Auth → Emails: invite / recovery / confirm-signup / change-email templates must use `{{ .ConfirmationURL }}`; keep "Secure email change" as desired; enable leaked-password protection (may need paid plan).
Flow type: the app and the website use the implicit flow (tokens in the URL fragment). The website cannot complete a PKCE `?code=` (verifier lives on the requesting device) and hands it to the app.
Optional later: set `EXPO_PUBLIC_AUTH_LINK_MODE=https` (app) once the allow-list above and assetlinks/AASA are live, so reset emails use `https://asbworkforce.online/reset-password`; `create-user` must then accept that https redirect (finding #8).

## Verification matrix (run after applying; all NOT TESTED against live Supabase)
| Flow | Steps | Expected |
|---|---|---|
| Password reset, app installed | App → Forgot password → open email link on the phone | App opens `/reset-password`, form shown, new password saved |
| Password reset, no app | Open link on desktop | Website `/reset-password` form, success message |
| Invite | Admin invites employee → open link | Same set-password screen/page |
| Email confirmation / email change | open link | `/auth/callback` shows confirmed (or "confirm the other address" for the first leg of secure change) |
| Expired/used link | reuse a link | "expired/invalid" message, no form |
