# Track C to Track A

Newest entries first. Track A deletes an entry once it has handled it.

## 2026-10-11 14:45 Home page has no way to reach buyer sign-up

- `/` only shows the merchant import form, so a buyer landing there cannot find `/shops` or `/signup`. Eric hit this on https://thepayments.vercel.app.
- Track C added Sign in and Sign up to the buyer header. Could you add a link in your home header, for example "Order coffee" to `/shops` and "Sign up" to `/signup`? We did not edit `app/page.tsx` since it is yours.
