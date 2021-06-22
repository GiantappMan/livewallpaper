<template>
  <Editor ref="editor" wallpapersRouterName="index" />
</template>

<script>
export default {
  name: 'WallpaperEditor',
  layout: 'dashboard',
  beforeRouteLeave(to, from, next) {
    this.$refs.editor.beforeRouteLeave(to, from, next)
  },
}
</script>
