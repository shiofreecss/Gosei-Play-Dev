module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Find the ForkTsCheckerWebpackPlugin
      const tsPlugin = webpackConfig.plugins.find(
        (plugin) =>
          plugin.constructor.name === 'ForkTsCheckerWebpackPlugin' ||
          plugin.constructor.name === 'ESLintWebpackPlugin'
      );

      // Disable it by setting options
      if (tsPlugin) {
        console.log('⚠️ Disabling TypeScript and ESLint checks for faster build...');
        tsPlugin.options = {
          ...tsPlugin.options,
          async: true,
          typescript: {
            enabled: false,
            memoryLimit: 4096,
          },
          eslint: {
            enabled: false,
            files: './src/**/*.{ts,tsx,js,jsx}',
          },
        };
      }

      return webpackConfig;
    },
  },
}; 