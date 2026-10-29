# Bhramari live connection

Website: https://bhramari-enterprises.vercel.app/

Supabase project: **Bhramari Enterprises**, in **greesh648's Org**, Mumbai (`ap-south-1`). Project reference: `enlhelzdlvbhychoxrrb`.

Dashboard: https://supabase.com/dashboard/project/enlhelzdlvbhychoxrrb

The `bhramari_platform_initial` migration was applied and all 13 application tables have row-level security. The four public Yoga programmes and public website settings were seeded. No candidate accounts or fake enquiries were seeded.

Public contact settings:

- Email: bhramarienterprises2@gmail.com
- Phone: +91 8130525975
- WhatsApp: https://wa.me/918130525975
- Instagram: https://www.instagram.com/bhramariyoga_wellness/

## Vercel runtime

Use Production environment variables in the Bhramari Vercel project, then redeploy:

| Variable | Value |
| --- | --- |
| NEXT_PUBLIC_SITE_URL | https://bhramari-enterprises.vercel.app |
| SUPABASE_URL | https://enlhelzdlvbhychoxrrb.supabase.co |
| SUPABASE_PUBLISHABLE_KEY | Copy the default publishable key from this project; it does not grant admin access |
| SUPABASE_SERVICE_ROLE_KEY | Copy this project's default secret key; store only as a Vercel Secret |
| RATE_LIMIT_SALT | A strong random private value, stored as a Vercel Secret |
| EMAIL_DELIVERY_ENABLED | false until the real email-delivery checks below pass |
| PHONE_OTP_ENABLED | false until SMS delivery and phone identities are configured |

Never put server keys, SMTP credentials or real submissions into GitHub. The modern `sb_secret_...` project key is supported by this server even though the environment variable retains the name `SUPABASE_SERVICE_ROLE_KEY`.

## Email signup and recovery

Adding a public Gmail contact link does not authenticate an email sender. Supabase's built-in test sender is restricted to project-team addresses and is not candidate email delivery. New Free projects need custom SMTP to edit verification templates.

In Supabase Authentication settings, keep email confirmation enabled. Set Site URL to the website origin above and allow the exact origin's `/api/auth/confirm` redirect.

If using the owner's Gmail for SMTP, enter its SMTP credentials privately in the Supabase dashboard. A normal Gmail password is not an app password. Use Google's current app-password setup with an eligible account, or an existing transactional SMTP provider. Do not paste any password into chat or source files.

Configure the signup email link as:

```html
<a href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your Bhramari account</a>
```

Configure the password recovery email link as:

```html
<a href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your Bhramari password</a>
```

After actual verification/recovery delivery has been tested, set `EMAIL_DELIVERY_ENABLED=true` in Vercel Production and redeploy. Until then, existing verified accounts can use password login; signup and recovery show a clear setup-pending state and do not call the mail provider. Direct phone/WhatsApp/email/Instagram links can operate independently.

## Owner access and enquiries

Once email delivery works, create and verify the intended owner's website account. Provision its exact verified Auth UUID in `public.admin_users` through trusted Supabase SQL, as documented in [SUPABASE.md](SUPABASE.md). Do not grant administrator access based on user-editable profile data.

The owner then signs in at `/login/` and opens `/admin/` for Users, Enquiries, Enrolments and programme settings. New registrations appear in Users; saved candidate enquiries appear in Enquiries. Until an owner account is provisioned, the Supabase project owner's Table Editor can inspect private records through the dashboard.

Email/WhatsApp alerts for new records are not implemented automatically by adding contact details. The owner checks the dashboard. WhatsApp links open a direct-chat draft that the visitor chooses to send.

For deployment and later domain changes, see [GITHUB-VERCEL.md](GITHUB-VERCEL.md). For privacy, retention, RLS and private batch information, see [SUPABASE.md](SUPABASE.md).
