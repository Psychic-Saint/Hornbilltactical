# Hornbill Tactical — Operations Platform

A three-layer security operations platform: **internal team console**, **client portal**, and **public / guest incident reporting** — backed by a real Supabase database with row-level tenant isolation.

---

## 1. Demo logins

**Staff console** → `staff/login.html`

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hornbilltactical.co.za` | `Hornbill#2026` |
| Agent | `agent@hornbilltactical.co.za` | `Hornbill#2026` |

**Client portal** → `client/login.html`

| Organisation | Email | Password |
|--------------|-------|----------|
| ABC Property Management | `ops@abcproperty.co.za` | `Client#2026` |
| Vaal Estate HOA | `security@vaalestate.co.za` | `Client#2026` |

**Public** → `index.html` (landing) · `report.html` · `quick-report.html` · `track.html` · `qr.html`

> Change these passwords before going live. Staff can create new client/staff logins from the console (**Clients → Add portal login**, **Users → Add staff**).

---

## 2. Run it

Every page is a static HTML file that talks to the live backend over HTTPS.

- **Quickest:** double-click `index.html`. Everything works except QR codes (they need a public URL to point at).
- **Recommended:** host the `platform/` folder on any static host — Netlify, Vercel, Cloudflare Pages, GitHub Pages, or your existing web server. Drag-and-drop the folder and you're live.

After hosting, open `qr.html` and set the **Deployed platform URL** to your live domain, then download / print the QR codes.

---

## 3. The three experiences

| Layer | Entry point | Who |
|-------|-------------|-----|
| **Internal** | `staff/console.html` | Hornbill team — full control: dashboard, incidents, clients, invoices, tasks, users, audit trail |
| **Client** | `client/portal.html` | Registered clients — their own dashboard, reporting, incident tracking, invoices, requests |
| **Public** | `report.html` → `quick-report.html` | Anyone — report in ~1 minute, no account, get a reference number, track it |

Flow: **See Report → Choose Login or Quick Report → Submit → Reference → (optional) Create account.**
Guest incidents can be claimed into a new or existing client account without losing history.

---

## 4. Backend (Supabase)

- **Project:** Hornbill Tactical Ops Platform · region `eu-west-3`
- **URL:** `https://cqacsvtzkhcuztnjbway.supabase.co`
- Connection settings live in `config.js`. The anon key is safe to expose — all access is enforced by **Row-Level Security**, not the frontend.

**Tables:** `clients`, `profiles` (staff), `client_users`, `incidents`, `incident_status_history`, `incident_updates` (internal vs client-visible), `incident_attachments`, `invoices`, `tasks`, `guest_tracking_tokens`, `incident_verification`, `rate_limit_hits`, `audit_log`, `incident_counters`.

**Edge Functions:** `quick-report`, `track-incident`, `client-signup`, `claim-incident`, `admin-create-user`, `admin-delete`, `send-invoice`, `drive-upload`.

**Reference numbers** auto-generate as `INC-YYYY-#####` via a database trigger.

---

## 5. Security model (verified)

- **Tenant isolation is enforced in the database.** A client user querying `incidents`, `invoices`, `tasks`, or `incident_updates` can only ever retrieve rows for their own organisation — proven by impersonating each client at the `authenticated` role: ABC saw only its 2 incidents / 3 invoices and **0** rows from other clients, staff, internal notes, or audit log.
- **Internal notes never reach clients.** `incident_updates.visibility = 'internal'` is filtered by RLS; clients only ever see `visibility = 'client'`.
- **The anonymous public role can read nothing** (0 rows on every table). All guest submissions and lookups go through service-role Edge Functions.
- **Guest reporting safeguards:** honeypot field, per-IP rate limiting (8 reports/hr, 30 lookups/hr), server-side input validation, file-type + 5 MB size limits, and a client-side CAPTCHA challenge.
- Guest tracking requires either the one-time tracking token or the reference number **plus** the email/phone used to report.

### Hardening checklist before production
- [ ] Rotate the demo passwords.
- [ ] Add a real CAPTCHA (Cloudflare Turnstile / hCaptcha) — swap the math check in `quick-report.html` and validate the token in the `quick-report` function.
- [ ] Configure an SMTP provider in Supabase Auth for password resets and (optionally) email/phone OTP verification.
- [ ] Set the storage `evidence` bucket scanning / size policy to taste; consider virus scanning on upload.
- [ ] Restrict Edge Function CORS from `*` to your live domain(s).

---

## 6. Everyday admin

- **Onboard a client:** Console → Clients → Add client → Add portal login.
- **Add a teammate:** Console → Users → Add staff.
- **Work an incident:** open it → set status / assign → post an *internal note* or a *client-visible update*.
- **Invoices & tasks:** Console → Invoices / Tasks.
- **Print site QR codes:** `qr.html`.

The public marketing site (`../index.html`) is intentionally left untouched — link its buttons to `platform/report.html` and `platform/client/login.html` whenever you're ready.

---

## 7. What's new in this revision

- **3D / motion polish** — animated aurora background, a live three.js particle core on the landing hero, cursor spotlight, tilting feature cards, scroll-reveal, and magnetic buttons (all respect "reduce motion").
- **Delete users & clients** — Console → Users (Delete) and Clients (Delete). Removes the auth login too; you can't delete your own account.
- **Excel import** — Console → Clients / Invoices / Incidents each have an **Import Excel** button with a downloadable template, live preview, and bulk insert (invoices/incidents match clients by name).
- **Password reset** — "Forgot password?" on both logins → email link → `reset.html` sets a new password. *(Needs SMTP, see below.)*
- **PDF invoices** — branded A4 invoice with VAT breakdown and banking details. **View PDF** (staff + client), **Download**, and **Send** (emails the PDF, or downloads + opens an email draft as fallback). Edit your company/banking details in `config.js` → `COMPANY`.
- **Google Drive storage** — evidence/invoices can sync to a Drive folder via the `drive-upload` function once configured.
- Client-logged incidents already save straight into the Hornbill database and appear in the staff console instantly.

### Turn on Google Drive storage
1. In Google Cloud, create a **service account**, enable the **Drive API**, and download its JSON key.
2. Create a Drive folder and **share it with the service account email** (Editor).
3. In Supabase → Project → Edge Functions → **Secrets**, add:
   `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY` (the full key incl. `-----BEGIN…`), `DRIVE_FOLDER_ID`.
4. Set `DRIVE_ENABLED: true` in `config.js`. New evidence uploads will then also land in Drive (a `drive_link` is stored on each file).

### Turn on real invoice email (Resend)
1. Create a [Resend](https://resend.com) account and **verify your sending domain**.
2. In Supabase Edge Function **Secrets**, add `RESEND_API_KEY` and `RESEND_FROM` (e.g. `Hornbill Tactical <invoices@hornbilltactical.co.za>`).
3. "Send" will now email the PDF directly. Until then it automatically falls back to **download + email draft** — no error, it just works the manual way.

### Turn on password-reset emails (SMTP)
Supabase → Authentication → **Email** → configure SMTP (or use the built-in provider for testing), and add your hosted `reset.html` URL under **URL Configuration → Redirect URLs**. Until SMTP is set, the reset link won't be delivered.

> These three are the only setup-gated items. Everything else works immediately.
