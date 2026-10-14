/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    reactStrictMode: false,
    // eslint 9 与 next 14 内置 lint 不兼容（偶发 Invalid Options 使构建失败），
    // 构建期关闭 lint；类型检查仍执行
    eslint: {
        ignoreDuringBuilds: true,
    },
    //false防止dev模式打印执行两次
    reactStrictMode: false,
}

module.exports = nextConfig
