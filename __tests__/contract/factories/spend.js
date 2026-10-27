const { randomUUID } = require("crypto");

// A submitJob on a real wallet burns real GNUS behind a native confirm, so only the mock runs
// spend cases by default. Any other factory needs GNUS_CONTRACT_ALLOW_SPEND=1.
function spendAllowed(factory) {
  return factory.name === "mock" || process.env.GNUS_CONTRACT_ALLOW_SPEND === "1";
}

// Random per call: the wallet remembers keys for 24 h, so a reused key answers idempotency_key_reused
// or replays an old result instead of the case under test.
const newKey = () => `contract-${randomUUID()}`;

module.exports = { spendAllowed, newKey };
