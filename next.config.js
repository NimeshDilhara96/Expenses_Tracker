/** @type {import('next').NextConfig} */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://code.jquery.com https://cdn.tailwindcss.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
        ]
      }
    ];
  },

  async redirects() {
    return [
      // Redirect any .html file to its clean URL
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/auth.html", destination: "/auth", permanent: true },
      { source: "/expense.html", destination: "/expense", permanent: true },
      { source: "/income.html", destination: "/income", permanent: true },
      { source: "/notes.html", destination: "/notes", permanent: true },
      { source: "/transfer.html", destination: "/transfer", permanent: true },
      { source: "/addexpense.html", destination: "/addexpense", permanent: true },
      { source: "/addincome.html", destination: "/addincome", permanent: true },
      { source: "/accounts.html", destination: "/accounts", permanent: true }
    ];
  },

  async rewrites() {
    return {
      beforeFiles: [
        { source: "/auth", destination: "/auth.html" },
        { source: "/expense", destination: "/expense.html" },
        { source: "/income", destination: "/income.html" },
        { source: "/notes", destination: "/notes.html" },
        { source: "/transfer", destination: "/transfer.html" },
        { source: "/addexpense", destination: "/addexpense.html" },
        { source: "/addincome", destination: "/addincome.html" },
        { source: "/accounts", destination: "/accounts.html" }
      ]
    };
  }
};

module.exports = nextConfig;
