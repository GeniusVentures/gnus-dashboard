const mockRequested = process.env.NEXT_PUBLIC_GNUS_MOCK === "1";

// The flag is for `next dev` only. A production build with it would ship a fake wallet that
// announces itself as GeniusWallet, so refuse unless a test-only variable says it is deliberate.
if (mockRequested && process.env.NODE_ENV === "production" && process.env.GNUS_MOCK_PRODUCTION_BUILD_TEST_ONLY !== "1") {
  throw new Error(
    "NEXT_PUBLIC_GNUS_MOCK=1 is for the dev server only; refusing a production build with the mock wallet",
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  // Always defined: an unset NEXT_PUBLIC variable is not inlined, so the guarded require in _app would not fold away and the mock chunk would ship.
  env: { NEXT_PUBLIC_GNUS_MOCK: mockRequested ? "1" : "0" },
};

module.exports = nextConfig;
