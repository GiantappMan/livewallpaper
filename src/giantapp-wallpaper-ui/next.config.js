/** @type {import('next').NextConfig} */

const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();
const nextConfig = {
    output: 'export',
    reactStrictMode: false,
    // build 保留console
    // webpack(config) {
    //     config.optimization.minimizer.forEach((minimizer) => {
    //         if (minimizer.constructor.name === 'TerserPlugin') {
    //             minimizer.options.terserOptions.compress.drop_console = false;
    //         }
    //     });

    //     return config;
    // },
}

module.exports = withNextIntl(nextConfig);
