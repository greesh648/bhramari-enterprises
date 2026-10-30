# Registration and enquiry acknowledgements on WhatsApp

Current status: the owner confirmed WhatsApp Business app only. **Automatic registration and enquiry messages are disabled until official sender setup is completed.** The website's public WhatsApp link opens a visitor's conversation with +91 8130525975. It does not send an automatic message to a registrant.

## App-only setup selected by the owner

No Facebook/Meta Platform onboarding is being performed. The website chat link has been checked: it opens +91 8130525975, displayed by WhatsApp as Greeshma MS, with a prepared message. Opening it does not send a message.

On the phone with that WhatsApp Business account: open **Tools → Greeting message**, turn on **Send greeting message**, edit the text, choose the intended **Recipients**, and **Save**. Suggested greeting: “Namaste! Welcome to Bhramari Yoga & Wellness. Thank you for contacting us. Please share your name and preferred programme: 7 days ₹899, 21 days ₹2,599, 1 month ₹3,999 or 3 months ₹4,999. We will help you confirm the next batch and enrolment details.”

The greeting replies when a customer first messages the business, or after 14 days of inactivity. The phone must have internet. Test with a new customer conversation; repeated tests from a recent chat may not receive another greeting. This setting must be enabled on the owner’s phone; the website cannot change it. See [official greeting-message instructions](https://faq.whatsapp.com/501866148528310/?cms_platform=android).

A website registration or saved enquiry alone cannot trigger the Business app’s greeting. After a real account request is accepted, the website offers **Continue on WhatsApp** without exposing the customer’s email or password in the URL. Enquiry forms offer a context draft as well. The customer opens WhatsApp and taps Send; only then can the Business app respond. Email verification remains separate.

## Available now: owner sends a welcome

Sign in with the authorised business owner account, open `/admin/`, then **Users** for registration welcomes or **Enquiries** for enquiry replies. For a user who opted in and provided a number with `+` and country code, **Prepare WhatsApp welcome** opens a draft addressed to that user. Review it and send from the WhatsApp business account for **+91 8130525975**. A web link cannot select or impersonate the sending account. No message is sent merely by opening the draft. Respect STOP requests and remove the user's opt-in before further messages.

## Optional future official API integration — inactive

The owner currently prefers the Business app only. The following API path is prepared for a future explicit choice; it has not been connected or activated.

### Enable genuine website-triggered automatic messages later

1. Open [Meta’s official direct setup](https://developers.facebook.com/products/whatsapp/onboard/direct) after signing in, or use a suitable official provider. Verify that the selected sender is **+91 8130525975**. Review Meta's current number-onboarding/coexistence rules before changing the existing app registration. Do not deregister the app just to try this integration.
2. Review current pricing and account terms yourself; no paid service or Meta billing has been activated by this project.
3. Obtain approved welcome and enquiry-acknowledgement templates in the chosen language. This implementation supports a static template with **no variables, media header, or dynamic buttons**. Suggested body for review: “Welcome to Bhramari Enterprises. Your account is now verified. For yoga class details and support, reply here or visit https://bhramari-enterprises.vercel.app/yoga. Reply STOP to opt out of WhatsApp updates.” Suggested separate enquiry body: “Thank you for contacting Bhramari Enterprises. We have received your website enquiry and will respond about your request. Programme places and batch details require separate confirmation. Reply STOP to opt out of WhatsApp updates.” Meta decides template classification and approval. A website submission does not start a WhatsApp conversation window.
4. Add these **server-only Vercel environment variables** using the official sender's credentials: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` (a currently supported Graph version such as `vXX.X`, not that literal placeholder), `WHATSAPP_WELCOME_TEMPLATE`, `WHATSAPP_ENQUIRY_TEMPLATE`, `WHATSAPP_TEMPLATE_LANGUAGE` (the exact approved code). Never put tokens in GitHub, public settings, or `NEXT_PUBLIC_` values.
5. Keep `WHATSAPP_REGISTRATION_ENABLED=false` and `WHATSAPP_ENQUIRY_ENABLED=false` until the sender and templates are verified. Enable each event separately in a controlled deployment. With an explicitly consenting recipient and a real international number, test signup/email confirmation and a successfully saved enquiry. Verify actual receipt and sender identity. Review Meta delivery status and Vercel logs. Turn the flag off if delivery fails.

The server sends a template request only after successful email signup verification (or an immediately verified signup), with a verified provider user ID and session. It reads the user's current profile under their own RLS scope and requires explicit WhatsApp opt-in plus an international number. Recovery, login, unverified signups and opted-out profiles do not trigger it. A separate enquiry acknowledgement runs only after the database returns a valid saved enquiry ID and that submission explicitly opts in with an international phone number. Invalid or failed saves never trigger it. A shared atomic database rate budget permits at most one automatic attempt per normalized recipient per 24 hours across both event types. This prevents duplicate notices from repeated enquiries or different accounts using the same number. Signup also retains a per-account limit. A second event within that period is still saved/confirmed but does not trigger another message. API failures do not undo account confirmation or enquiry persistence. Form success confirms the website record, not WhatsApp delivery. Provider responses and tokens are not exposed to the customer.

This initial integration has no delivery webhook, automatic retry queue, bulk sender or automatic STOP processing. A provider message reference means acceptance, **not delivery**. The owner must monitor WhatsApp, handle STOP promptly, and update consent before any manual follow-up. Customers can also turn off their preference in My Bhramari. Do not promise delivery based on registration success or a provider message reference.

Official references: [Meta Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [WhatsApp Business messaging policy](https://business.whatsapp.com/policy).
