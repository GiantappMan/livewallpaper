/** @type {import('next').NextConfig} */
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
    //false防止dev模式打印执行两次
    reactStrictMode: false,
}

module.exports = nextConfig
