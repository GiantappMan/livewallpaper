// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    srcDir: 'src/',
    modules: [
        '@nuxtjs/tailwindcss',
        '@huntersofbook/naive-ui-nuxt'
    ],
    build: { transpile: ["@headlessui/vue"] },
    // Optionally, specify global naive-ui config
    // Supports options that are normally set via 'n-config-provider'
    // https://www.naiveui.com/en-US/os-theme/docs/customize-theme
    naiveUI: {
        themeOverrides: {
            common: {
                primaryColor: '#ff0000',
                primaryColorHover: '#8b0000'
            }
        }
    }
})
