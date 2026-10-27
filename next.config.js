/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  // Always defined: an unset NEXT_PUBLIC variable is not inlined, so the guarded require in _app would not fold away and the mock chunk would ship.
  env: { NEXT_PUBLIC_GNUS_MOCK: process.env.NEXT_PUBLIC_GNUS_MOCK === "1" ? "1" : "0" },
};

module.exports = nextConfig;
