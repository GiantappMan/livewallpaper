<template>
  <b-navbar
    :style="[light ? { 'box-shadow': '0 1px 0 hsla(0, 0%, 100%, 0.2)' } : {}]"
    class="is-spaced has-shadow"
    :class="{ 'is-fixed-top': stick, 'is-primary': light }"
  >
    <template slot="brand">
      <b-navbar-item tag="a" :href="$local.getOnlineUrl('', $i18n.locale)">
        <img width="28" height="28" src="@/assets/imgs/icon.png" />
      </b-navbar-item>
    </template>
    <template slot="start">
      <b-navbar-item tag="a" :href="$local.getOnlineUrl('', $i18n.locale)">
        {{ $t('common.home') }}
      </b-navbar-item>
      <b-navbar-item
        tag="nuxt-link"
        :to="localePath('/')"
        :active="$nuxt.$route.path === '/'"
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
  },
  computed: {},
  methods: {
    toggle: function () {
      this.menuActive = !this.menuActive
    },
  },
}
</script>
<style scoped></style>
