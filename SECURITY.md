# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through GitHub's private vulnerability reporting:
**[Report a vulnerability](https://github.com/amanjhacodes55/tabby/security/advisories/new)**
(repository **Security** tab → **Advisories** → **Report a vulnerability**).

Include what you found, steps to reproduce (a curl command against a local `npm run preview` is ideal),
the impact, and any suggested fix. Please don't test against other people's groups on the hosted
instance; create your own group or run Tabby locally.

You'll get an acknowledgement as soon as the maintainer can, and we'll coordinate a fix and disclosure
date with you. Credit is given in the advisory unless you'd rather stay anonymous.

## Supported versions

Only the latest commit on `main` (and the hosted instance built from it) gets security fixes.

## Security model: what is and isn't a vulnerability

Tabby deliberately has **no accounts**. Please read this before reporting:

- **A group id is a bearer secret.** Anyone who has a group's link or id can read and edit everything
  in that group through the UI or the [API](docs/api/README.md). This is by design. Ids are
  22 crypto-random characters (132 bits).
- **"Added by" / `createdBy` is self-reported** and not proof of identity.
- **There is no application-level rate limiting**; limits come from validation, a 32 KB body cap and per-group row caps.

Things we **do** want to hear about, for example:

- Guessing, enumerating or leaking group ids (e.g. through logs, referrers, search indexing or error messages).
- Reading or changing data in a group without knowing its id, or across groups.
- Bypassing validation in a way that corrupts balances (amounts that don't add up, overflow, negative amounts).
- XSS, CSV/formula injection, open redirects, or malicious `upi://` link construction.
- Ways to exhaust the Worker or D1 far beyond what the documented limits allow.
