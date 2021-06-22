<template>
  <b-menu class="media-left">
    <b-menu-list
      :label="$t(group.label)"
      :key="group.label"
      v-for="group in groups"
    >
      <template v-for="item in group.menus">
        <b-menu-item
          v-if="item.href"
          :active="$nuxt.$route.path == localePath(item.to)"
          :key="item.label"
          :icon="item.icon"
          icon-pack="fas"
          :label="$t(item.label)"
          :href="$local.getOnlineUrl(item.href, $i18n.locale)"
          :tag="item.href ? 'a' : 'nuxt-link'"
          :to="localePath(item.to)"
        ></b-menu-item>
        <b-menu-item
          v-else
          :active="$nuxt.$route.path == localePath(item.to)"
          :key="item.label"
          :icon="item.icon"
          icon-pack="fas"
          :label="$t(item.label)"
          tag="nuxt-link"
          :to="localePath(item.to)"
        ></b-menu-item>
      </template>
    </b-menu-list>
  </b-menu>
</template>
<script>
export default {
  props: ['groups'],
}
</script>
