# Contributing to Tabby

Thanks for helping! Bug reports, fixes, translations of money formats, and small, focused features are all welcome.

## Ground rules

- Open an issue first for anything bigger than a bug fix, so we can agree on the approach.
- Keep Tabby's promises: no accounts, no ads, no tracking, no daily limits, and money that always adds up exactly.
- Be kind. Assume good faith in issues and reviews.

## Development setup

You need **Node.js 22 or newer** (Wrangler 4 requires it). The repo has an [`.nvmrc`](.nvmrc).

```bash
git clone https://github.com/amanjhacodes55/tabby.git
cd tabby
nvm use                    # or install Node 22 another way
npm install
npm run db:migrate:local   # creates the local D1 (SQLite) database under .wrangler/
```

No Cloudflare account, login or secrets are needed for local work. Everything runs against a local D1 database.

Run the app:

```bash
npm run dev       # next dev on http://localhost:3000, D1 proxied by wrangler (fast refresh)
npm run preview   # OpenNext build + the real Worker in workerd on http://localhost:8787
```

Use `npm run preview` before opening a PR that touches routing, the API or anything Worker-specific;
it's the closest thing to production.

To reset your local data, stop the server and delete `.wrangler/state`, then run
`npm run db:migrate:local` again.

### Database changes

Schema changes go in a **new** numbered file in [`migrations/`](migrations) (e.g. `0002_add_x.sql`).
Never edit a migration that has already shipped. Apply it locally with `npm run db:migrate:local`.
Remember that money is always stored as `INTEGER` minor units.

If you change `wrangler.jsonc` bindings, run `npm run cf-typegen` to regenerate `cloudflare-env.d.ts`.

## Checks

```bash
npm test            # Vitest (src/**/*.test.ts)
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
```

All three must pass. Add or update tests for any change to the pure logic in `src/lib/`
(split math, balances, money parsing, UPI, CSV). These are the parts where a bug costs someone real money.

## Pull request checklist

- [ ] The change is focused and the description explains *why*.
- [ ] `npm test`, `npm run typecheck` and `npm run lint` pass.
- [ ] New logic in `src/lib/` has tests; amounts stay integer minor units (no floats).
- [ ] API changes keep zod validation and limits in place, and [`docs/api/`](docs/api/README.md) is updated.
- [ ] Schema changes come as a new migration file.
- [ ] UI changes work at phone width (~390 px) and in both light and dark mode. Screenshots in the PR help.
- [ ] No secrets, personal data, `.wrangler/`, `.dev.vars` or build output committed.
- [ ] If you changed screenshots in `docs/screenshots/`, they use fictional names only.

## License of contributions

Tabby is licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). By submitting
a contribution you agree that it is licensed under **AGPL-3.0-or-later**, and that you have the right
to submit it under that license.

## Security issues

Please don't open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).
