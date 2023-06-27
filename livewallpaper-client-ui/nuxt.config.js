export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',
  generate: {
    dir: '../LiveWallpaper.Shell/wwwroot/',
  },

  publicRuntimeConfig: {
    expectedClientVersion: process.env.expectedClientVersion,
    releaseNotesUrl: process.env.releaseNotesUrl,
    appStoreUrl: process.env.appStoreUrl,
    donateUrl: process.env.donateUrl,
  },

  router: {
    base: '/',
  },
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'livewallpaper-client-ui',
    htmlAttrs: {
      lang: 'en',
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: ['~assets/scss/styles.scss'],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    { src: '~/plugins/local.js' },
    { src: '~/plugins/route.client.js' },
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,
  components: [
    '~/components/layout',
    '~/components/wallpaper',
    '~/components/wallpaper/common',
  ],
  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: ['@nuxtjs/fontawesome', '@nuxtjs/pwa'],
  pwa: {
    icon: {
      purpose: 'any',
    },
    workbox: {
      // https://pwa.nuxtjs.org/workbox
      /* workbox options */
      // 虽然缓存问题搞不定，还是打开因为webview2每个版本都清缓存
      enabled: true,
    },
  },
  fontawesome: {
    icons: {
      solid: [
        'faUndo',
        'faSyncAlt',
        'faFileImage',
        'faGlobe',
        'faCaretUp',
        'faListAlt',
        'faUser',
        'faEye',
        'faFolderOpen',
        'faTags',
        'faEdit',
        'faTrashAlt',
        'faChevronLeft',
        'faChevronRight',
        'faFighterJet',
        'faQuestionCircle',
        'faCaretDown',
        'faCog',
        'faSignOutAlt',
        'faSignInAlt',
        'faUpload',
        'faTimesCircle',
        'faCheck',
        'faBan',
        'faVolumeUp',
        'faVolumeMute',
        'faDesktop',
        'faClock',
        'faLayerGroup',
        'faKey',
        'faExclamationCircle',
        'faUnlock',
      ],
      // regular: [],
      // light: [],
      // duotone: [],
      brands: [
        'faGithub',
        'faWeixin',
        'faCreativeCommonsNcJp',
        'faCloudversify',
      ],
    },
  },

  buefy: {
    css: false,
    materialDesignIcons: false,
    defaultIconPack: 'fas',
    defaultIconComponent: 'font-awesome-icon',
  },
  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    // https://go.nuxtjs.dev/buefy
    'nuxt-buefy',
    // https://go.nuxtjs.dev/axios
    '@nuxtjs/axios',
    'nuxt-i18n',
  ],

  i18n: {
    locales: [
      { code: 'en', iso: 'en', file: 'en.json', name: 'English' },
      { code: 'ru', iso: 'ru', file: 'ru.json', name: 'Русский' },
      { code: 'zh', iso: 'zh', file: 'zh.json', name: '中文（简体）' },
      {
        code: 'zh-cht',
        iso: 'zh-TW',
        file: 'zh-CHT.json',
        name: '中文（繁體）',
      },
      {
        code: 'pt-BR',
        iso: 'pt-BR',
        file: 'pt-BR.json',
        name: 'Português (Brasil)',
      },
    ],
    langDir: 'livewallpaper_i18n/',
    defaultLocale: 'zh',
    lazy: 'true',
    vueI18n: {
      fallbackLocale: 'zh',
    },
  },
  // Axios module configuration: https://go.nuxtjs.dev/config-axios
  axios: {},

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    //分类css文件，不包含到页内
    extractCSS: true,
  },
}
