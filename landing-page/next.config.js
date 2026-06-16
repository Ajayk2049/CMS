/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    appIsrStatus: false,
  },
  // Allows local network connections without HMR blocking in Next.js development
  allowedDevOrigins: ['192.168.31.195', '172.16.0.2', 'localhost', '127.0.0.1']
};

module.exports = nextConfig;
