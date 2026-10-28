# Bhramari Enterprises — Phase 2 platform

The existing Next.js/TypeScript website, supplied logo, white design and six business verticals are retained. Phase 2 adds normal customer accounts, an owner dashboard, database-backed content, enquiries, enrolment records, online Zoom information, configurable contact/social links and restrained poster depth.

## Current readiness

The website and server architecture are implemented. **Supabase project credentials, SMTP/SMS services and official contact/social details are not supplied.** Until connected, account and save operations visibly say **Requires backend configuration**. No users, OTPs, enquiries, confirmations, payments or automatic WhatsApp messages are fabricated.

The existing Sites review audience remains private. Bhramari customer authentication is separate from the outer ChatGPT review-site sign-in. Do not advertise customer access until the final host/audience and backend have been configured and tested. The proposed bhramarienterprises.com domain has not been purchased or connected.

## Run locally

Use Node.js 24+ and npm:

```sh
npm ci
npm run dev
```

Visit http://127.0.0.1:3000. Development uses a local server boundary around Next's page compiler on port 3002, so account/API protection also runs locally. To test the exact production output:

```sh
npm run build
npm run preview
```

Production preview: http://127.0.0.1:3001. The preview reads server-only values from untracked .env.local. Restart it after changing environment variables.

Checks:

```sh
npm run typecheck
npm test
npm run test:db
node scripts/check-export.cjs
```

The database test uses isolated PostgreSQL/PGlite and rolls back fixtures. Server tests use a simulated upstream to test boundaries; they do not claim hosted email/SMS or actual Supabase integration. There is no linter configured; lint has not been claimed as passed.

## Architecture and deployment

For GitHub and Vercel, follow [docs/GITHUB-VERCEL.md](docs/GITHUB-VERCEL.md). It covers importing the repository, the protected Vercel runtime, environment variables, owner access and connecting an owned domain.

Next still produces its established prerendered pages and assets in out/. A lightweight server Worker wraps them for same-origin APIs, secure cookies and route protection. scripts/build-platform.mjs embeds those retained assets into dist/server/index.js and writes the Worker hosting manifest. No heavy WebGL, client authentication SDK, CMS framework or application database dependency was added to the public bundle.

**Deploy the Worker artifact, not out/ alone.** A static-only deployment would omit the authentication/API boundary. The tracked .openai/hosting.json preserves the existing project ID and deliberately no longer declares static.directory. This runtime fits the existing Sites Worker ESM hosting workflow. Native Sites source synchronization, packaging and deployment publish the generated Worker; do not place secrets in the hosting manifest.

A compatible standalone Worker host can use dist/server/index.js with the server environment values below. HTTPS is required in production; the local adapter allows HTTP only for local testing. Public content updates are read from Supabase on subsequent visits/focus and after owner saves. Changing prices, contact details or a batch does not require a code build/deployment. Initial environment/domain changes may require a hosting restart/deployment.

## Backend setup

1. Create/select the intended Supabase project.
2. Apply supabase/migrations/0001_platform.sql, then supabase/seed.sql in its trusted SQL Editor. Seed inserts public course/settings defaults only and preserves existing owner edits.
3. Configure the server runtime using .env.example. Do not use NEXT_PUBLIC_ for backend keys.
4. Enable email/password and email confirmation; configure production SMTP and actual verification/recovery templates.
5. Create and verify your customer account, then provision its exact trusted UUID in public.admin_users through the Supabase SQL Editor.
6. Sign in through /login/ and visit /admin/.
7. Validate the actual hosted configuration with separate customer/admin test accounts before real users.

Detailed schema, role, SMTP, phone and email-template instructions: **docs/SUPABASE.md**. Everyday owner tasks: **docs/OWNER-GUIDE.md**.

## Environment variables

| Name | Purpose |
| --- | --- |
| NEXT_PUBLIC_SITE_URL | Optional build-time canonical fallback. Set only to a confirmed origin. |
| SUPABASE_URL | Intended project HTTPS URL, server-side. |
| SUPABASE_PUBLISHABLE_KEY | Project public/publishable API key, used by the server. Not an administrator credential. |
| SUPABASE_SERVICE_ROLE_KEY | Privileged server-only key, limited in code to validated enquiry and rate-limit RPCs. Never expose it. |
| RATE_LIMIT_SALT | Random server-only salt for hashed request budgets; set a distinct strong value. |
| PHONE_OTP_ENABLED | false until SMS and existing Auth phone identities are configured and tested. |
| TURNSTILE_SITE_KEY | Optional public challenge site key, paired with the secret. |
| TURNSTILE_SECRET_KEY | Optional server-only Turnstile verification secret. |

No SMTP password, Meta token or permanent Zoom credential belongs in client code. SMTP/SMS are configured in Supabase/provider settings, not in public React variables. Runtime secrets are configured in the chosen host; .env.local is for local use and is ignored by Git.

## Authentication and private data

- Email/password requests go to Supabase Auth through same-origin server endpoints. Passwords are never written into profile tables.
- Server sessions use HttpOnly, SameSite=Lax cookies; production cookies are Secure. Tokens are not returned to browser JavaScript or placed in local storage.
- Server requests verify the user with the provider and refresh through the provider when needed. Mutable APIs reject cross-origin requests.
- /account/ is server-protected. /admin/ and every admin API also require trusted database membership through is_admin().
- User metadata and editable profile fields cannot grant administrator privileges.
- RLS independently limits customers to their own profile/enquiries/enrolments. Admin writes use the verified admin JWT and RLS, not a service-key bypass.
- Private joining details require both the assigned enrolment and batch to be Confirmed. Private owner notes have separate admin-only tables.
- Public enquiries are validated twice, rate-limited, honeypot-checked and optionally CAPTCHA-checked. An authenticated programme enquiry creates Enquiry Received, never automatic confirmation.

Phone OTP is prepared but disabled. Its request uses create_user:false and requires an existing verified Supabase Auth phone identity. A contact phone entered in a profile is not a phone sign-in identity. See docs before enabling it.

Email confirmation/recovery templates must use the server token-hash handler at /api/auth/confirm, as documented. A verification link does not expose access/refresh tokens to client JavaScript.

## Editable content and assets

Public frequent content comes from site_settings, yoga_programmes, yoga_batches, social_reels and supported content_blocks. Admin sections provide normal labelled inputs and FAQ controls, not raw JSON. Supported text blocks are homepage-intro, yoga-intro and yoga-faq. Blank blocks retain the existing editorial fallback.

lib/content.ts and lib/yoga-programmes.ts remain version-controlled fallbacks and initial seed sources. Once the backend is connected, edit prices/timings/FAQ/display/availability through /admin/; editing fallback files will not overwrite saved database content. Re-running seed preserves owner edits.

The supplied unchanged logo is public/images/bhramari-logo.jpg. Reusable SVG poses are components/yoga-illustration.tsx. Local programme images remain configurable in programme image.src/image.alt; instructor fallback details are in yogaSettings. No image upload/storage workflow is activated. Only add verified information and assets you may use.

All scheduled Yoga sessions are **Live Online via Zoom**. The public site explains this without exposing private joining links. Actual batch dates, fees, meeting days and instructor credentials must be supplied before enrolment is confirmed.

## WhatsApp, Instagram and Zoom

Contact Details in /admin/ controls one public phone, WhatsApp number, email and Instagram URL. Empty values show no fabricated link. Phone uses tel:, email uses mailto:, WhatsApp opens a contextual click-to-chat draft and Instagram opens the verified profile. Visitors still choose whether to send their WhatsApp message.

Social / Reels allows manually selected official Instagram URLs and optional thumbnails; the page shows up to six published cards. No scraping or automatic Instagram API sync is included. No Instagram tracking/embed scripts load automatically; configured thumbnails may load from their source.

Meta/WhatsApp AI and automated business messaging require separate eligible official services and provider configuration. This website does not activate automation or silently send messages. Optional programme-update consent is unchecked and separate from marketing.

Zoom URLs, passcodes and official batch WhatsApp group invitations belong only in a batch's private joining editor. Public settings, descriptions and notices must never contain them. No Zoom API credentials or automated meeting creation are implemented.

## Domain, privacy and launch

Use the current verified review origin while configuring Auth. When the final domain is registered, set the runtime Site Settings origin, build-time fallback and Supabase Site URL/redirect allowlist consistently. The email templates must point to that verified origin's token-hash handler.

Use only the hosting provider's supplied DNS records (commonly CNAME for www and A/AAAA/ALIAS for apex). Preserve existing mail records. Enable managed HTTPS, verify certificate renewal and redirect HTTP to HTTPS with one primary hostname. No DNS records were changed by this work.

The privacy notice describes account, enquiry, cookie and third-party handling, but controller/contact, processor locations, retention and applicable rights require owner review before real collection. No legal compliance certification is claimed. Complete official contact, instructor and programme details, and test real enquiry persistence and actual email/SMS delivery before public launch. Payments remain inactive.
