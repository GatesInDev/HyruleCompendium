/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pre-build minification is active by default in Next.js during `next build`
  // and image optimization is active out of the box.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'botw-compendium.herokuapp.com',
      },
      {
        protocol: 'https',
        hostname: 'hyrule.games', // Add more Zelda CDNs as needed
      }
    ]
  }
};

export default nextConfig;
