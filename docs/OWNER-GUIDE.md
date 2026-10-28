# Owner guide — My Bhramari and administration

## First-time setup

Your website includes the platform screens and secure server/database architecture. They cannot save records or create accounts until a real Supabase project is connected. The visible message Requires backend configuration is intentional, not a broken or fake sign-in.

Follow SUPABASE.md to apply the migration/seed, configure server values and production email, and verify your account. Add your exact verified Auth UUID to admin_users through the trusted SQL Editor. A normal account is always a customer; the website never lets a user promote themselves.

After setup, open /login/, sign in and visit **/admin/**. The current review Site also has its existing private ChatGPT access gate; that does not replace your Bhramari login.

## Your regular controls

| Task | Where and how |
| --- | --- |
| Change a Yoga price | Yoga Programmes → Edit → Programme price → Save changes. Include currency and fee basis; blank shows Price to be confirmed. |
| Change the programme session time | Yoga Programmes → Edit → Session timing (IST) → Save. |
| Change a particular batch time/date | Batches → Edit → Timing / Start date / End date → Save. |
| Add a batch | Batches → Add batch → choose programme, name, dates, timing, optional capacity and status → Save. |
| Pause enquiries or hide a programme | Yoga Programmes → enquiry availability / display checkbox → Save. Hiding removes the public catalogue/detail page; existing enrolled customers retain their own programme information. |
| Edit programme text or FAQ | Yoga Programmes → Edit → descriptions / practice highlights / FAQ controls → Save. Existing curriculum and illustrations are preserved. |
| Edit homepage/Yoga text | Website Content → edit Homepage introduction, Yoga introduction or Yoga FAQ. Plain text only. Blank content uses the established fallback. |
| Add a homepage notice | Contact Details → Homepage announcement → Save. |
| Change public phone/email/WhatsApp | Contact Details → edit the relevant field → Save. WhatsApp requires country code. Leave details blank until verified. |
| Set Instagram profile | Contact Details → Instagram profile URL → Save. |
| Add a Reel | Social / Reels → Add reel → title, official reel URL, optional owned thumbnail, order and Published → Save. Up to six published cards appear. |
| Remove a Reel | Social / Reels → Edit the intended reel → confirm removal. Check the record before deleting. |
| View enquiries | Enquiries → read the message → update New, Contacted, In Discussion or Closed. Owner notes are private. |
| View registered customers | Users. Contact information is available for appropriate business administration; passwords are never shown. |
| Manage enrolments | Enrollments → Edit → assign a matching batch and choose the appropriate status. Confirmation is a deliberate owner action. |
| Add private class joining details | Batches → Private joining details → Zoom URL/ID/passcode and any official group invite → Save privately. |

Saved public changes are fetched from the database without a code deployment. The website refreshes content after owner saves, when navigating pages and when a browser tab receives focus. If viewing an older open page, refresh it.

## Confirming participants

A programme enquiry is not a booking or payment. A logged-in customer’s Yoga enquiry begins as Enquiry Received. You can move it to Enrollment Pending while arrangements are discussed.

Before setting Confirmed, verify the programme, batch, dates, availability and any agreed business terms. Assign the correct batch. Set the batch itself to Confirmed when joining arrangements are ready. Only then can that assigned confirmed customer retrieve its private Zoom/group information.

A guest enquiry is not automatically linked to an account by matching an email. This protects private data. Ask the customer to sign in and submit programme interest from their own account when an enrolment record is needed.

## Public contact and social details

One saved WhatsApp number is reused by the floating button, header/contact options, programme enquiries, footer and account area. The site creates a message draft; the customer chooses to send it. No automatic message or Meta AI response is enabled by saving the number.

Use your own official Instagram profile and selected Reel URLs. Thumbnail images should be yours or used with permission. Broken thumbnails use a neutral fallback. The website does not scrape Instagram.

## Keep private details private

Use only the private batch editor for Zoom URLs, IDs, passcodes and group invitations. Never paste them into public course text, FAQ, notices, Reel descriptions or Site Settings. Programme-update opt-in is not permission for unrelated marketing.

Do not paste API keys, SMTP passwords or Supabase service keys into content fields. Server configuration belongs in your hosting/Supabase settings. Do not publish the site or collect real data until the privacy notice and business details are reviewed.

## If an operation fails

A successful save is shown only after the API accepts it. A failed request leaves an error with a retry option. Requires backend configuration means setup is incomplete; no save was made. If provider credentials, SMTP, SMS or domain settings change, retest those real services.

The review link remains private until you explicitly choose a customer-accessible hosting/audience arrangement. No domain ownership or registration is assumed.
