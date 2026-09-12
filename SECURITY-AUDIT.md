# A.N.T.E — Pre-Launch Security Audit Report

- **Project:** A.N.T.E (Arabic RTL medical uniform store)
- **Stack:** Next.js 16.3.4 (App Router, Turbopack) · React 19.2.8 · Supabase (Postgres + Auth + Storage) · Vercel (production: https://ante-kappa.vercel.app)
- **Date:** 2026-09-12
- **Scope:** Application hardening + database/storage/auth posture, per launch checklist (Part A: plan · Part B: audit).

---

## 1. Summary

| # | Checklist item | Status |
|---|---|---|
| 1 | Secrets hygiene (no keys in code/repo) | ✅ Pass |
| 2 | Service-role key used only server-side | ✅ Pass (configured, verified) |
| 3 | Supabase "Allow new users to sign up" disabled | ⚠️ Dashboard toggle — now defense-in-depth only |
| 4 | Auth: single admin, magic-link (passwordless), PKCE, admin identity in server-only env | ✅ Pass |
| 5 | Admin access gated to ONE allowlisted email (RLS `is_admin()`, not just "any authenticated") | ✅ Pass (verified with fake-user probe) |
| 6 | RLS enabled on all tables | ✅ Pass |
| 7 | Guest (anon) writes removed from orders/order_items | ✅ Pass |
| 8 | Server-side order validation (prices/stock/sizes/colors) | ✅ Pass (POST /api/orders, service role) |
| 9 | Rate limiting on checkout + OTP | ✅ Pass (Upstash + in-memory fallback) |
| 10 | Input validation (zod) | ✅ Pass |
| 11 | Honeypot anti-bot on checkout | ✅ Pass (verified live) |
| 12 | Storage: UGC buckets private | ✅ Pass |
| 13 | Uploads: server-side magic-byte type + size checks | ✅ Pass |
| 14 | XSS: React auto-escaping; no dangerouslySetInnerHTML | ✅ Pass |
| 15 | Security headers + CSP | ✅ Pass (verified live) |
| 16 | Dependency audit | ⚠️ 2 moderate (transitive `uuid` via `exceljs` — accepted) |
| 17 | Secrets absent from client bundle (server-only guard) | ✅ Pass |
| 18 | No secrets in git history (service key, DB password, anon key) | ✅ Pass |
| 19 | Redact admin email from repo HEAD + app UI | ✅ Pass (history scrub optional) |

Legend: ✅ pass · ⚠️ accepted residual risk · ⏳ requires owner action (dashboard)

---

## 2. Secrets & configuration

**✅ Pass.** Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` were present. `.env.local` and `.vercel` are gitignored; no secret has ever been committed (`git log --all -p` verified). No service-role / DB secrets in code or Vercel env vars, and no key logging paths were found.

**⏳ Pending:** set `SUPABASE_SERVICE_ROLE_KEY` (secret, not `NEXT_PUBLIC_`) in:
- Vercel → project `ante` → Settings → Environment Variables → **redeploy after adding**
- local `.env.local` for development

The new `/api/orders` route fails **closed** when it is missing (design choice) — checkout returns an error until this is set.

---

## 3. Authentication

**✅ Pass.**
- Passwordless magic-link OTP via email (`signInWithOtp`, PKCE flow); no password storage, no signup route.
- **Admin identity lives only in the server-side `ADMIN_EMAIL` env var** (`.env.local` + Vercel, gitignored) — no email literal in the repo or client bundle.
- **On-demand provisioning:** `POST /api/auth/send-otp` (service role) idempotently upserts the admin email into the `admin_emails` allowlist and creates/confirms the passwordless auth user, so login needs no pre-seeded email anywhere and works even with signups disabled.
- Callback exchanges the PKCE code client-side with a path guard (`next` must start with `/admin`) — open-redirect prevented.
- OTP sending is rate-limited (6/5 min per IP, 3/10 min per email) and always returns `ok:true` even for unknown addresses → no account enumeration (verified live).
- **Session storage note:** `@supabase/ssr` stores tokens in non-httpOnly cookies (`sameSite:lax`) — library-standard design; acceptable as the site posts no user HTML.

**Admin gating (the critical fix):** RLS no longer treats "any authenticated user" as admin (that was the self-signup backdoor). A `public.is_admin()` function reads the `admin_emails` allowlist and compares against the session JWT email. Every admin policy uses it, so **even with signups enabled, a self-registered user has zero admin access**. Verified live by creating a fake user, signing in, and confirming all writes/reads/storage were denied; intel cleanup performed.

---

## 4. Authorization & Row Level Security

**✅ Pass.** RLS enabled on all 6 public tables (`products`, `preset_logos`, `orders`, `order_items`, `payment_methods`, `settings`, `gallery_images`). Post-migration policy matrix (verified against live DB):

| Table | Public | Allowlisted admin (`is_admin()`) |
|---|---|---|
| products | SELECT | INSERT/UPDATE/DELETE |
| preset_logos | SELECT (active) + admin reads inactive | INSERT/UPDATE/DELETE |
| orders | — | SELECT/UPDATE/DELETE |
| order_items | — | SELECT/UPDATE/DELETE |
| payment_methods | SELECT | INSERT/UPDATE/DELETE |
| settings | SELECT | INSERT/UPDATE |
| gallery_images | SELECT | INSERT/UPDATE/DELETE |

**Admin gating:** all admin policies are `public.is_admin()` = session JWT email ∈ `admin_emails` allowlist (populated only by server-side provisioning; RLS-on + revoked on `admin_emails`, no anon/authenticated access). Verified against live DB — zero policies remain keyed to `auth.role() = 'authenticated'`.

**Remove guest writes:** `orders_guest_insert` and `order_items_guest_insert` were **dropped** (live DB) — orders are created only through the server route with the service-role key. Guests can no longer insert fabricated orders or price-tampered line items directly against PostgREST.

---

## 5. Server-side validation & trust boundary

**✅ Pass.** `POST /api/orders` no longer trusts client-side totals:
- zod-validates the full payload (names, Egyptian phone format, address, sizes ∈ SIZES, qty 1–99, honeypot);
- re-fetches products from the DB and **recomputes every unit price** (`discountRatio`) — client-submitted `unit_price` is ignored;
- rejects: unknown/out-of-stock products, sizes/colors not in the product's own lists, customization on non-customizable products, inactive payment methods;
- verifies preset logos exist and are `active`.

The payment page compresses uploaded images client-side (≤1280px JPEG) before sending, keeping the JSON well under Vercel's ~4.5 MB body limit.

---

## 6. Rate limiting

**✅ Pass.** `lib/rate-limit.ts` — Upstash `slidingWindow` when `UPSTASH_REDIS_REST_URL`/`TOKEN` are set (multi-instance / prod), in-memory fallback otherwise (effective single-instance, e.g. local). Applied to:
- orders: 10 / min / IP (verified live → 429)
- OTP: 6 / 5 min / IP, 3 / 10 min / email

**⚠️ Note:** on Vercel's default serverless the in-memory fallback is per-instance; for strict distributed limiting add the two Upstash vars. Not launch-blocking for this traffic level.

---

## 7. Input validation

**✅ Pass.** `lib/validations.ts` (zod v4): checkout schema + admin product schema (price ≥ 0, discount 0–100, sizes ∈ SIZES, bounded colors/img counts). Used by the orders route; admin input still flows through existing client checks (defense-in-depth server route covers the order path, which is the externally writable surface).

---

## 8. Storage & uploads

**✅ Pass.** `uploaded-logos` and `payment-proofs` set to `public = false` (live DB + schema.sql). Removed public SELECT/INSERT policies on both; reads are `is_admin()` gated for **short-lived signed URLs**.
- UGC proofs & logos are no longer world-readable (payment screenshots + custom logos were previously fully public).
- Server route uploads via service role after magic-byte sniffing (`file-type`: PNG/JPEG/WebP only) and per-file ≤5 MB bounds (+20 MB aggregate guard).
- Admin panel resolves stored paths to signed URLs via new `resolveStorageSignedUrl()` in `lib/admin.ts`.

Remaining storefront buckets (`product-images`, `preset-logos`, `gallery-images`) stay public by design.

---

## 9. XSS / output encoding

**✅ Pass.** No `dangerouslySetInnerHTML` / `innerHTML` anywhere. React escapes all user/DB text by default. Uploaded SVGs are not served to clients (magic-byte whitelist allows only raster). No eval-based dependency in page bundles.

---

## 10. Security headers & CSP

**✅ Pass (verified live).** Applied globally through `next.config.ts`:
- `X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`
- `Cross-Origin-Opener-Policy: same-origin`
- CSP: `default-src 'self'`; `script-src 'self' 'unsafe-inline'`; restricted `img`/`font`/`connect` sources incl. Supabase; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`.

**⚠️ Residual:** `'unsafe-inline'` on `script-src` is required by Next's hydration bootstrap unless a nonce-based CSP (middleware-generated) is used. Given the tiny, auto-escaped page surface it is an accepted trade-off; upgrade path is a middleware nonce + `strict-dynamic`.

---

## 11. Deployment & hosting

- **HTTPS:** enforced by Vercel. ⏳ Add `https://ante-kappa.vercel.app/auth/callback` (and `http://localhost:3000/auth/callback`) to Supabase Auth redirect allow-list so magic-link + PKCE completes cleanly.
- Production deployed manually via Vercel CLI (no GitHub auto-deploy). Verified `200` + headers live after each deploy.

---

## 12. Dependency audit

- `npm audit`: **2 moderate** — transitive `uuid <11.1.1` via `exceljs` (used only for admin Excel export). Not exploitable in this context (advisory requires attacker-controlled `buf`; `exceljs` doesn't expose that path). No non-breaking fix (uuid ≥11 drops CommonJS, breaking `exceljs`). **Accepted risk**; revisit after an `exceljs` release supporting a patched uuid.

---

## 13. Remaining owner actions (dashboard/optional — none is security-blocking)

1. **Authentication → Sign In / Up → "Allow new users to sign up" → OFF.** *No longer security-critical* (RLS is `is_admin()` email-gated, verified), but keeps the platform tidy: without it, people can still open accounts in your Supabase Auth users list.

2. **Authentication → URL/Redirect:** add `http://localhost:3000/auth/callback` and `https://ante-kappa.vercel.app/auth/callback`.

3. *(Optional)* Upstash: add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for distributed rate limiting.

4. *(Optional)* Rotate `SUPABASE_SERVICE_ROLE_KEY` in the dashboard if you ever shared it in a transcript — then update Vercel + `.env.local`.

---

## 14. Action log (this hardening pass)

- Added deps: `zod`, `@upstash/ratelimit`, `@upstash/redis`, `file-type`, `server-only`.
- New: `lib/validations.ts`, `lib/rate-limit.ts`, `lib/supabase/admin-server.ts` (server-only-guarded), `lib/image-type.ts`, `app/api/orders/route.ts`, `app/api/auth/send-otp/route.ts`.
- Reworked `lib/orders.ts` → POST `/api/orders`; added client-side image compression.
- Honeypot on `/checkout` + `/payment`; login now calls the rate-limited OTP API.
- Bucket/RLS migration applied to live DB + `supabase/schema.sql` (private UGC buckets; no guest inserts).
- **Admin access lock:** `admin_emails` allowlist + `public.is_admin()` (JWT email check) replaces every `auth.role()='authenticated'` policy on tables + storage; admin identity moved to server-only `ADMIN_EMAIL` env with on-demand user/allowlist provisioning; admin email removed from app UI and repo HEAD.
- Admin orders UI resolves signed URLs for proofs/logos.
- Security headers in `next.config.ts`.
- Verified: TS clean, production build clean, live probes (fake-user sign-in blocked on products/orders/settings/storage; OTP provisioning populates allowlist + confirms admin user; honeypot, rate limit, headers, checkout E2E all pass), deployed Vercel.