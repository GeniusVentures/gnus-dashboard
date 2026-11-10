// The one place the security headers live. `node scripts/headers.js` (run by `yarn build` after next build) writes
// out/_headers for Cloudflare Pages; serve-out.js and check-deploy.js read the same table, so CI tests what the host sends.
"use strict";
const fs = require("fs");
const path = require("path");

// Report-only first; the flip to enforced waits on a hosted pairing with GeniusWallet that passes under it.
const CSP_ENFORCED = false;

// Each source added beyond 'self' names the asset that needs it.
const policy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "manifest-src 'self'",
  // The relay is the one outside connection; Reown Sign Client opens it only on the browser path.
  "connect-src 'self' wss://relay.walletconnect.org",
  // Reown Verify: the page registers its attestation through a hidden iframe on every proposal and request.
  "frame-src https://verify.walletconnect.org",
  "frame-ancestors 'none'",
  // _app sets <base href="/">.
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
].join("; ");

const cspName = (enforced) => (enforced ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only");

// Applied to every path. No Cache-Control here: Pages joins a header set by two rules with a comma.
const securityHeaders = (enforced = CSP_ENFORCED) => [
  [cspName(enforced), policy],
  ["Strict-Transport-Security", "max-age=31536000"],
  ["X-Content-Type-Options", "nosniff"],
  // Not no-referrer: Verify's frame learns the page origin from the browser, and an attestation without one reads UNKNOWN.
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Frame-Options", "DENY"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
  ["Cross-Origin-Opener-Policy", "same-origin"],
];

const STATIC_PREFIX = "/_next/static/";
const IMMUTABLE = "public, max-age=31536000, immutable";

/** Every header a response for this path carries, as [name, value] pairs. HTML is told to revalidate. */
function headersFor(pathname, { html = false, enforced = CSP_ENFORCED } = {}) {
  const headers = securityHeaders(enforced);
  if (pathname.startsWith(STATIC_PREFIX)) {
    headers.push(["Cache-Control", IMMUTABLE]);
  } else if (html) {
    headers.push(["Cache-Control", "no-cache"]);
  }
  return headers;
}

function headersFile(enforced = CSP_ENFORCED) {
  const block = (lines) => lines.map(([name, value]) => `  ${name}: ${value}`).join("\n");
  return `/*\n${block(securityHeaders(enforced))}\n\n${STATIC_PREFIX}*\n${block([["Cache-Control", IMMUTABLE]])}\n`;
}

// Reown hosts the 2.26.0 client contains that this page never connects to, each with its reason.
const UNUSED_HOSTS = {
  "verify.walletconnect.com": "the older Verify host; 2.26.0 attests through verify.walletconnect.org",
  "rpc.walletconnect.org": "the RPC proxy of UniversalProvider, which this page does not use",
  "pulse.walletconnect.org": "telemetry; the client starts with telemetryEnabled false",
  "echo.walletconnect.com": "wallet push registration, a wallet-side feature",
  "relay.walletconnect.com": "the older relay host; 2.26.0 defaults to relay.walletconnect.org",
};

const HOST_PATTERN = /\b(?:[a-z0-9-]+\.)+(?:walletconnect|reown)\.(?:org|com|network|xyz|io)\b/gi;

const policyHosts = () => new Set([...policy.matchAll(/(?:https|wss):\/\/([a-z0-9.-]+)/gi)].map((m) => m[1].toLowerCase()));

/** WalletConnect and Reown hosts in the built chunks that the policy neither allows nor names as unused. */
function unlistedHosts(chunksDir) {
  const allowed = policyHosts();
  const found = new Set();
  for (const file of fs.readdirSync(chunksDir, { recursive: true })) {
    if (String(file).endsWith(".js")) {
      const text = fs.readFileSync(path.join(chunksDir, String(file)), "utf8");
      for (const [host] of text.matchAll(HOST_PATTERN)) {
        found.add(host.toLowerCase());
      }
    }
  }
  return [...found].filter((host) => !allowed.has(host) && !Object.hasOwn(UNUSED_HOSTS, host)).sort();
}

function main(out = path.resolve(__dirname, "..", "out")) {
  if (!fs.existsSync(out)) {
    console.error("out/ is missing: run next build first");
    return 1;
  }
  const chunks = path.join(out, "_next", "static", "chunks");
  const unlisted = fs.existsSync(chunks) ? unlistedHosts(chunks) : [];
  if (unlisted.length > 0) {
    console.error(
      `The built chunks name WalletConnect or Reown hosts that scripts/headers.js neither allows nor lists as unused: ${unlisted.join(", ")}.\n` +
        "Add each to the policy (with the asset that needs it) or to UNUSED_HOSTS (with the reason).",
    );
    return 1;
  }
  fs.writeFileSync(path.join(out, "_headers"), headersFile());
  console.log(`wrote out/_headers (${CSP_ENFORCED ? "enforced" : "report-only"} CSP)`);
  return 0;
}

module.exports = {
  CSP_ENFORCED,
  policy,
  cspName,
  securityHeaders,
  headersFor,
  headersFile,
  unlistedHosts,
  main,
  UNUSED_HOSTS,
  STATIC_PREFIX,
};

if (require.main === module) {
  process.exit(main());
}
