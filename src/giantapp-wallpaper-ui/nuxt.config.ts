// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  router: {
    options: {
      hashMode: true
    }
  },
  compatibilityDate: "2024-07-03",
  devtools: { enabled: true },
  extends: ['@nuxt/ui-pro'],
  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
  ],
  future: {
    compatibilityVersion: 4
  },
  runtimeConfig: {
    public: {
      HUB_Address: process.env.HUB_Address
    }
  }
})
