# gnus-dashboard

This project uses **Yarn** for package management and requires **npm** to be installed first.

## Setup & Start

Make sure you have [Node.js](https://nodejs.org/) installed, which includes `npm`.  
Then, run the following commands:

```bash
# Install Yarn globally
npm install --global yarn

# Install project dependencies
yarn

# Start the development server
yarn dev
```

## Opening the dashboard in a browser

Outside GeniusWallet the page pairs with the wallet over WalletConnect. A build needs a Reown project id in
`NEXT_PUBLIC_WC_PROJECT_ID`; with none the page shows "GeniusWallet required" and loads no WalletConnect code.
The id is never committed: for local work put your own dev id in `.env.local` (gitignored), and deploys set it
from CI variables.

```bash
# .env.local
NEXT_PUBLIC_WC_PROJECT_ID=<your dev project id>

# serves http://127.0.0.1:3000
yarn dev
```

Pair with a debug GeniusWallet build, which accepts the unverified `127.0.0.1` origin. A release wallet only
pairs with an origin verified in Reown Cloud.

Without a wallet, `NEXT_PUBLIC_GNUS_MOCK=1 yarn dev` and `?gnusWc=<profile>` show every pairing screen against a fake
relay over the mock wallet: `approve`, `decline`, `notGenius`, `oldGenius`, `proposalExpires`, `offline`, `walletEnds`,
`latency`, `dropEvents` or `zombie`. The relay answers by itself after two seconds. `?gnusMock=<profile>` picks the
wallet behind it.

## Hosting

The static export is published to Cloudflare Pages by `.github/workflows/deploy.yml`: a push to `main` deploys production,
a pull request from this repository deploys a preview at `pr-<number>`, and fork pull requests never deploy. The headers
and the Content-Security-Policy are code in `scripts/headers.js`; `yarn build` writes `out/_headers` from it.

Nothing is configured yet, so the deploy step skips itself with a notice. To switch it on:

1. Cloudflare: create an account and a Pages project for Direct Upload, production branch `main`.
2. Create an API token limited to Account > Cloudflare Pages > Edit.
3. GitHub: add the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and the repository variable
   `CLOUDFLARE_PAGES_PROJECT` (suggested `gnus-dashboard`).
4. GitHub: create the environments `production` (deployment branch `main` only) and `preview`, each with its own
   variable `NEXT_PUBLIC_WC_PROJECT_ID` holding a different Reown project id; `production` may also set
   `DASHBOARD_ORIGIN` once a custom domain exists.
5. Reown Cloud: one project per environment; verify the production origin there so a release GeniusWallet accepts it.

Check the same things locally:

```bash
yarn build
yarn test:csp                    # the export under the real policy, zero violations
node scripts/serve-out.js node scripts/check-deploy.js http://127.0.0.1:4173
```

`aws-ec2-deploy.yml` stays manual and fails at its first step until the cutover.
