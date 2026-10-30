# Registration welcomes on WhatsApp

Current status: the business has the WhatsApp app/WhatsApp Business app only. **Automatic registration messages are disabled.** The website's public WhatsApp link opens a visitor's conversation with +91 8130525975. It does not send an automatic message to a registrant.

## Available now: owner sends a welcome

Sign in with the authorised business owner account, open `/admin/`, then **Users**. For a user who opted in and provided a number with `+` and country code, **Prepare WhatsApp welcome** opens a draft addressed to that user. Review it and send from the WhatsApp business account for **+91 8130525975**. A web link cannot select or impersonate the sending account. No message is sent merely by opening the draft. Respect STOP requests and remove the user's opt-in before further messages.

## Enable genuine automatic messages later

1. Set up an official WhatsApp Business Platform/Cloud API account with Meta or a suitable official provider. Verify that the selected sender is **+91 8130525975**. Review Meta's current number-onboarding/coexistence rules before changing the existing app registration. Do not deregister the app just to try this integration.
2. Review current pricing and account terms yourself; no paid service or Meta billing has been activated by this project.
3. Obtain an approved welcome template in the chosen language. This implementation supports a static template with **no variables, media header, or dynamic buttons**. Suggested body for review: “Welcome to Bhramari Enterprises. Your account is now verified. For yoga class details and support, reply here or visit https://bhramari-enterprises.vercel.app/yoga. Reply STOP to opt out of WhatsApp updates.” Meta decides template classification and approval.
4. Add these **server-only Vercel environment variables** using the official sender's credentials: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` (a currently supported Graph version such as `vXX.X`, not that literal placeholder), `WHATSAPP_WELCOME_TEMPLATE`, `WHATSAPP_TEMPLATE_LANGUAGE` (the exact approved code). Never put tokens in GitHub, public settings, or `NEXT_PUBLIC_` values.
5. Keep `WHATSAPP_REGISTRATION_ENABLED=false` until the sender and template are verified. Enable it in a controlled deployment, create a consenting test account with a real international number, and confirm the email. Verify actual receipt and sender identity. Review Meta delivery status and Vercel logs. Turn the flag off if delivery fails.

The server sends a template request only after successful email signup verification (or an immediately verified signup), with a verified provider user ID and session. It reads the user's current profile under their own RLS scope and requires explicit WhatsApp opt-in plus an international number. Recovery, login, unverified signups and opted-out profiles do not trigger it. An atomic database rate budget permits at most one automatic attempt per account per 24 hours. API failures do not undo account confirmation. Provider responses and tokens are not exposed to the customer.

This initial integration has no delivery webhook, automatic retry queue, bulk sender or automatic STOP processing. A provider message reference means acceptance, **not delivery**. The owner must monitor WhatsApp, handle STOP promptly, and update consent before any manual follow-up. Customers can also turn off their preference in My Bhramari. Do not promise delivery based on registration success or a provider message reference.

Official references: [Meta Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [WhatsApp Business messaging policy](https://business.whatsapp.com/policy).
