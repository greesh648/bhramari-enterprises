# Supabase setup and data access

The repository contains a database migration; no remote project or tables have been created without credentials. Until the backend is configured, account, OTP, saving and admin operations must report **Requires backend configuration**. The existing site remains a private review site independently of customer authentication.

## Create and configure the intended project

1. Create/select your Supabase project and save its recovery details securely. Apply `supabase/migrations/0001_platform.sql` in the project's SQL Editor as its database owner. Review the target project before running it. Apply the generated `supabase/seed.sql` after the migration; this seeds only public website content, not users or fake enrolments.
2. Configure these values in the website's **server runtime**, never in public source or a `NEXT_PUBLIC_` variable: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Use the project's service-role key only on the server. The public/publishable key still depends on Row Level Security; it is not an admin key.
3. Set the actual website origin in the website's domain configuration and Supabase Auth Site URL/redirect allowlist. The proposed `https://bhramarienterprises.com` is not assumed to be owned or registered. Use the real private review origin while testing, and update allowlists when your final domain is confirmed.
4. Enable email/password sign-in and email confirmation in Supabase Auth. Configure a password minimum of at least 12 characters to match the website and production SMTP. Verify sender ownership and test actual verification/recovery delivery. Provider defaults and test mail limits are not a production email service.
5. Configure the confirmation email template to direct the user to your origin's server handler, using `{{ .TokenHash }}` and the appropriate verification type. For signup, use `https://YOUR-CONFIRMED-ORIGIN/api/auth/confirm?token_hash={{ .TokenHash }}&type=signup`; for recovery use `type=recovery`. Do not put raw access/refresh tokens into browser code or URLs.
6. Keep phone OTP disabled until an SMS provider is actually configured in Supabase Auth. Then set the website's `PHONE_OTP_ENABLED` flag and test a real send/verify cycle, delivery region, limits and cost controls. This website requests OTP with `create_user:false`, so it is for an existing Supabase Auth phone identity. A number entered only in `profiles.phone` is an unverified contact field and does not create or link a phone login identity. Verify/link a phone identity through an appropriate configured Auth account process before advertising phone sign-in. No test code pretends to send an OTP.
7. Configure optional CAPTCHA/Turnstile settings and server rate limits according to the main deployment guide. Do not expose secret CAPTCHA, SMTP, Meta or Zoom keys.

Supabase Auth handles password hashing, verification, tokens and refresh. The website server stores session tokens in HttpOnly cookies and checks the provider before private operations. The customer frontend does not store passwords or receive a service-role key. Database policies also enforce identity and role checks, independently of what the UI displays.

## First owner/admin account

Create and verify your ordinary Bhramari account first. In Supabase Authentication → Users, identify your own account and copy its exact UUID. Through the trusted Supabase SQL Editor, run:

```sql
insert into public.admin_users(user_id)
values ('REPLACE-WITH-YOUR-VERIFIED-AUTH-USER-UUID'::uuid)
on conflict (user_id) do nothing;
```

Do not copy a UUID from a website form or an unverified person. Sign in again and open `/admin/`. A normal verified account has customer access only. There is no public role field, self-promotion endpoint or browser write policy for `admin_users`; even the website admin interface cannot grant additional administrators. Manage trusted admin membership through database administration. To remove membership later, delete only the intended UUID from `public.admin_users` in the SQL Editor.

If the account was created before this migration, the migration backfills its profile without inventing information. If any project-specific auth trigger already manages profiles, review trigger interactions before applying this migration.

## What is stored where

| Table | Purpose and access |
| --- | --- |
| `auth.users` | Supabase-managed authentication. Passwords are not duplicated in app tables. |
| `profiles` | Name, provider-owned email, contact phone and optional WhatsApp opt-in. Own profile or admin read; users can update only their own name, phone and consent. |
| `admin_users` | Trusted admin UUID membership, with no normal Data API grants. |
| `enquiries` | Enquiry content, user association where verified, category, programme, consent timestamp and follow-up status. Own user or admin read; guest records are not public. |
| `enquiry_notes` | Separate private owner notes, admin only. |
| `yoga_programmes` | Editable public course content, prices, timings, visibility and enquiry availability. Admin writes; public sees displayed courses only. An enrolled customer can still read their own programme when it is hidden from the public catalogue. |
| `yoga_batches` | Programme, batch dates, timing, capacity and batch status. Public sees safe Open/Confirmed batch details for displayed courses; customers can also see their assigned batch. |
| `batch_access` | Private Zoom details, instructions and WhatsApp group link. Only admins or the assigned customer whose enrolment **and batch** are Confirmed can read. |
| `yoga_enrollments` | Customer/programme/batch association and status. Own user or admin read; only admins update confirmation and assignment. |
| `enrollment_notes` | Separate private admin notes, admin only. |
| `site_settings` | Public brand/contact/social/announcement/SEO settings. Never put secrets or private joining links here. |
| `social_reels` | Manually managed Instagram reel URLs, optional owned thumbnail URLs, order and publication toggle. Public sees published records only. |
| `content_blocks` | Public editable text and FAQ blocks; plain text/JSON, not executable HTML. |
| `rate_limits` | Server-only bounded request counters keyed by salted hashes, not raw IP addresses. Old counters are pruned. |

All 13 app tables have RLS enabled and explicit grants. `public.is_admin()` reads trusted membership using the current verified Auth identity; user-editable metadata is not an authority. Customer profile email is synchronised from Auth and cannot be changed through the profile endpoint. A contact phone in a profile is not proof of phone verification; OTP verification belongs to Auth.

## Enquiry and enrolment transaction

The server validates the request, verifies any customer session and applies a rate budget before calling the service-role-only `submit_enquiry(p_payload jsonb, p_user_id uuid)` function. The UUID must come from the verified provider user, never request data. The function validates again and inserts a private enquiry. For a verified customer with a displayed programme accepting enquiries, it creates an **Enquiry Received** enrolment in the same transaction. It never automatically confirms a booking or payment.

A guest enquiry does not create a customer or enrolment. Submitting the same displayed programme again while an enrolment is open reuses that enrolment without changing its status. Completed courses can be enquired about again. This prevents duplicate open enrolments while keeping repeat participation possible.

`consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)` is also executable only by the service role. The server supplies a salted hash and a bounded budget. Both functions revoke the default PUBLIC/anonymous/authenticated execution privilege. Do not grant them to browser roles.

## Managing content and private batch access

After backend setup and trusted admin provisioning, `/admin/` provides the owner interface. Edit prices/timing/content in Yoga Programmes; create dates and batch arrangements in Batches; use Contact Details/Website Content/Social to change centrally configured public information without redeployment. Enrolments can be assigned to a matching programme batch and manually advanced through their statuses.

Store Zoom URLs/meeting IDs/passcodes and WhatsApp group links **only** in the batch's private joining details. Do not place them in course descriptions, FAQs, public site settings, source files, reel captions or notices. Batch and enrolment confirmation are separate steps; private access requires both. Use waiting rooms, passcodes and host controls as appropriate within Zoom. Group membership and actual WhatsApp messages still require the owner's and participant's actions; this schema does not send messages or enable Meta AI.

## Verification before real users

For the isolated local SQL test, install the project development dependencies and run `npm run test:db`. This invokes `supabase/tests/run-local.mjs` with PGlite 0.5.12, an ephemeral PostgreSQL runtime. It creates minimal local Auth-role stubs for policy evaluation, executes the migration twice, executes the security assertions, verifies fixture rollback and closes the database. It does not simulate successful real sign-in or send email/SMS, and its Auth stubs are never part of production migrations.

Run `supabase/tests/security.sql` only against a local/disposable test project after migration. It wraps fixtures and assertions in a transaction and rolls them back. Do not use production customer data for tests. It checks anonymous/customer/admin boundaries, self-promotion denial, protected notes/Zoom data, immutable profile email, matching programme/batch constraints and server-only RPC privileges.

Then test real signup, email verification, login/logout, customer isolation, rejected admin access, owner content edits, persisted enquiries and manually confirmed batch access with separate test accounts. Verify that a customer cannot fetch another customer's records or private joining data directly through the REST API. The repository's local/model tests are not a substitute for validating the policies and configured Auth/SMTP/SMS services on your actual project.

Review the privacy notice before collecting personal data. Establish retention/deletion and access procedures, identify your controller/privacy contact and processors, and do not reuse enquiry details for unrelated marketing. Optional WhatsApp programme updates are separate from promotional consent and must remain unchecked by default.

## Official references

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database function privileges and security](https://supabase.com/docs/guides/database/functions)
- [Managing user profiles and Auth triggers](https://supabase.com/docs/guides/auth/managing-user-data)
- [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Phone login](https://supabase.com/docs/guides/auth/phone-login)
- [Production SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
