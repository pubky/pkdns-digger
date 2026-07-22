import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', 
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true,
    };

    // Add WASM file handling
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // On the server side, externalize the pkarr package to avoid WASM loading issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@synonymdev/pkarr');
    }

    // Ensure proper handling of ES modules
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };

    return config;
  },
};

export default nextConfig;
