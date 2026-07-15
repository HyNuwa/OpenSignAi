/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@opensign/ui', '@opensign/shared-types'],
}

module.exports = nextConfig
