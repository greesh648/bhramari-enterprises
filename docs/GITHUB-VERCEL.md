# Publish through GitHub and Vercel

The repository should contain this website folder at its root: `package.json`, `app/`, `api/`, `worker/`, `scripts/`, `supabase/` and `vercel.json` should sit together. Use a private GitHub repository unless you intend to publish the source code. A private repository can still deploy a public website on Vercel.

Account access, a successful Vercel build and the resulting deployment URL must be verified separately. Preparing these files does not register a domain or activate account/enquiry storage.

## 1. Put the source on GitHub

Use your intended GitHub account; the connected account during preparation was `greesh648`. A suitable repository name is `bhramari-enterprises`.

If a repository has already been created and uploaded for this project, use that repository. Otherwise create an empty private repository on GitHub, without adding a README, licence or `.gitignore`, then push this folder with Git or GitHub Desktop. When using Git, add the new URL as a separate remote named `github` and push the `main` branch. Keep any existing hosting remote intact.

Never upload `.env.local`, real service keys, `node_modules/`, `.next/`, `out/`, `dist/` or local test data. The supplied `.gitignore` excludes generated builds and environment files; `.env.example` is intentionally safe to commit. Sign in through GitHub's normal browser/credential flow rather than placing a token in a remote URL.

## 2. Import the repository into Vercel

1. Sign in at [Vercel](https://vercel.com/) and select the intended account/team.
2. Choose **Add New → Project**, connect GitHub if requested and import the Bhramari repository. Grant the Vercel GitHub application access to that repository if it is not listed.
3. Use the settings below. The checked-in `vercel.json` supplies the deployment configuration.
4. Choose **Deploy** and wait for **Ready**. Open the actual URL Vercel returns and check the pages. A successful local build alone does not confirm a Vercel deployment.

| Setting | Value |
| --- | --- |
| Project name | `bhramari-enterprises`, or another available name |
| Root Directory | `.` when this website is the repository root; otherwise the folder containing this `package.json` and `vercel.json` |
| Framework Preset | **Other**; the website uses Next for page generation and a separate protected server runtime |
| Node.js Version | **24.x** |
| Install Command | `npm ci` |
| Build Command | `npm run build`, as checked into `vercel.json` |
| Output Directory | `vercel-public` |
| Production Branch | `main` |

Do not change the output directory to `out/`. Public files and APIs are served through `api/index.mjs`, which imports the generated `dist/server/index.js` runtime. This preserves the `/account/` and `/admin/` server checks. Publishing the raw Next export alone would omit that boundary. `vercel-public` contains only a harmless deployment health file and no exported account/admin pages.

Vercel can deploy subsequent Git pushes automatically after the repository is connected. See [Vercel's Git deployment guide](https://vercel.com/docs/git) and [configuration reference](https://vercel.com/docs/project-configuration/vercel-json).

## 3. Connect accounts, registered data and enquiries

The website needs Supabase before new accounts or enquiries can be saved. Add the following in **Vercel project → Settings → Environment Variables**; use the intended Production environment. Use a separate disposable backend for Preview testing where possible.

| Variable | What to enter |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | The actual HTTPS production origin, without a path; use the assigned Vercel URL until an owned custom domain is connected |
| `SUPABASE_URL` | Your intended Supabase project's HTTPS URL |
| `SUPABASE_PUBLISHABLE_KEY` | That project's publishable/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | That project's privileged server-only service key; mark sensitive where available |
| `RATE_LIMIT_SALT` | A new strong random server-only value, distinct from the service key |
| `PHONE_OTP_ENABLED` | `false` until real SMS delivery and existing Auth phone identities are configured and tested |
| `TURNSTILE_SITE_KEY` | Optional Turnstile site key for the actual hostname |
| `TURNSTILE_SECRET_KEY` | Matching optional server-only secret |

The build also detects Vercel's verified project-production or deployment hostname when `NEXT_PUBLIC_SITE_URL` is blank. Set the variable explicitly for an owned custom domain, and keep the Supabase Auth origin consistent with it. Vercel host detection does not register or connect a domain.

Keep the backend variable names exactly as shown; never prefix privileged keys with `NEXT_PUBLIC_`. Do not paste secrets into GitHub files, public content or screenshots. After environment changes, **redeploy** for them to take effect. [Vercel documents environment scope and redeployment here](https://vercel.com/docs/environment-variables).

In the intended Supabase project's trusted SQL Editor, apply `supabase/migrations/0001_platform.sql`, then `supabase/seed.sql`. Configure email/password authentication, production SMTP, verification/recovery templates and the actual website origin. Follow [SUPABASE.md](SUPABASE.md) for the exact steps, including provisioning the first verified owner UUID in `public.admin_users`.

The everyday links on the deployed origin are:

- `/create-account/`: new customer registration.
- `/login/`: customer and owner sign-in.
- `/account/`: a customer's own profile, enquiries and programme records.
- `/admin/`: the trusted owner's Users, Enquiries, Enrolments, Programmes, Batches and website settings.

Customer passwords belong to Supabase Auth. Private application data belongs to the RLS-protected Supabase tables, not GitHub or browser local storage. Without real Supabase configuration, the site must continue to show that accounts/saving require backend configuration.

Before accepting real users, test signup, actual verification-email delivery, login/logout, one saved enquiry, owner access and customer isolation on the deployed website with separate test accounts. Local security tests do not establish that your hosted provider is configured.

## 4. Configure contact links

After the owner account is working, open `/admin/` → **Contact Details**. Add only verified business details. The official WhatsApp number has not been supplied; leave it blank until available. Enter the country code with the number when supplied. A configured click-to-chat link opens WhatsApp with a draft; the visitor chooses whether to send it. No automatic WhatsApp sending is enabled.

Frequent content changes use the owner dashboard. Source fallbacks are in `lib/content.ts`, `lib/yoga-programmes.ts` and `lib/platform-defaults.ts`. The supplied logo is `public/images/bhramari-logo.jpg`; see [OWNER-GUIDE.md](OWNER-GUIDE.md) for content, assets and private Zoom details.

## 5. Connect an owned domain later

The proposed `bhramarienterprises.com` is not assumed to be registered or owned. Do not purchase or alter DNS as part of an automatic deployment.

Once you have authorised domain access, open **Vercel project → Settings → Domains**, add the intended hostname and follow the exact DNS values Vercel displays. Add the requested records through the domain's existing DNS provider, preserve mail records and choose one primary hostname. Required A/CNAME/TXT values can vary by project; do not copy an unrelated example. Vercel provisions HTTPS after successful DNS/domain verification. [Official domain setup instructions](https://vercel.com/docs/domains/set-up-custom-domain).

Then update `NEXT_PUBLIC_SITE_URL`, the owner dashboard's website origin, Supabase Auth Site URL/redirect allowlist and confirmation/recovery template origins consistently. Redeploy and test HTTPS, redirects, canonical URLs, sitemap and email links on the final hostname.

## Still requiring real configuration

Supabase project credentials and migration; production email service; the first verified owner account; official WhatsApp/contact/social details; optional spam protection; and the final domain. SMS, payments, automated WhatsApp messaging and Zoom meeting creation are not activated by publishing this website.
