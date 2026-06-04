//@ts-check

const { composePlugins, withNx } = require('@nx/next');
const { join } = require('path');

/** @type {import('@nx/next/plugins/with-nx').WithNxOptions} */
const nextConfig = {
  nx: {},
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias['@knocksafe/ui/components'] = join(
      __dirname,
      '../../libs/ui/components/src',
    );
    return config;
  },
};

module.exports = composePlugins(withNx)(nextConfig);
