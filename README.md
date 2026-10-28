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
