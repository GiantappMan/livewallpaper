<template>
  <b-navbar
    :style="[light ? { 'box-shadow': '0 1px 0 hsla(0, 0%, 100%, 0.2)' } : {}]"
    class="is-spaced has-shadow"
    :class="{ 'is-fixed-top': stick, 'is-primary': light }"
  >
    <template slot="brand">
      <b-navbar-item tag="nuxt-link" :to="localePath(localTo)">
        <img width="28" height="28" src="@/assets/imgs/icon.png" />
      </b-navbar-item>
    </template>
    <template slot="start">
      <b-navbar-item tag="a" :href="$local.getOnlineUrl('', $i18n.locale)">
        {{ $t('common.home') }}
      </b-navbar-item>
      <b-navbar-item
        tag="nuxt-link"
        :to="localePath(localTo)"
        :active="$nuxt.$route.path === localePath(localTo)"
      >
        {{ $t('local.title') }}
      </b-navbar-item>
      <b-navbar-item
        tag="a"
        :href="$local.getOnlineUrl('wallpapers', $i18n.locale)"
      >
        {{ $t('wallpapers.title') }}
      </b-navbar-item>
    </template>

    <template slot="end">
      <b-navbar-item tag="div">
        <div class="buttons">
          <slot></slot>
          <DownloadManager v-if="isLocalWallpaperPage" />
        </div>
      </b-navbar-item>
    </template>
  </b-navbar>
</template>

<style></style>

<script>
export default {
  data() {
    return {
      menuActive: false,
    }
  },
  props: {
    stick: Boolean,
    light: Boolean,
    //本地壁纸页路由；server-ui里本地壁纸挂在/local，客户端应用挂在/，由使用方传入
    localTo: {
      type: String,
      default: '/',
    },
  },
  computed: {
    //下载管理属于本地壁纸功能，只在本地壁纸页显示；客户端应用路由名是index，server-ui是local
    isLocalWallpaperPage() {
      const name = this.$route.name || ''
      return ['index', 'local'].some(
        (n) => name === n || name.startsWith(n + '___')
      )
    },
  },
  methods: {
    toggle: function () {
      this.menuActive = !this.menuActive
    },
  },
}
</script>
<style scoped></style>
