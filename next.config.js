// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Or whatever other configs you might have
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/v0/b/show-folio.firebasestorage.app/o/**", // More specific path to your bucket's objects
      },
    ],
    // If you prefer the older `domains` array (less secure, but simpler for a single domain):
    // domains: ['firebasestorage.googleapis.com'],
  },
};

module.exports = nextConfig;
