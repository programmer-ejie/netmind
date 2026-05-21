# Brevo Email Setup

Use Brevo on Render because it sends through HTTPS instead of SMTP ports.

1. Create a free Brevo account.
2. Verify a sender email in Brevo.
3. Create an SMTP/API key in Brevo.
4. Add these Render environment variables:

```env
EMAIL_PROVIDER=brevo
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender@example.com
BREVO_SENDER_NAME=NetMind
```

Optional local test:

```bash
npm run email:test-brevo
```

`BREVO_SENDER_EMAIL` must be verified in Brevo, otherwise Brevo will reject the request.
