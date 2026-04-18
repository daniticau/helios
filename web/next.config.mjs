/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Known Next 15 + Windows issue where trace file collection fails for
  // /_not-found (writes the trace but then can't re-read it from the
  // nested path). Vercel handles tracing natively, so disabling the local
  // phase is safe for our deploy target. See:
  // https://github.com/vercel/next.js/issues/71256
  outputFileTracingRoot: process.cwd(),
  generateBuildId: async () => 'helios-web',

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
