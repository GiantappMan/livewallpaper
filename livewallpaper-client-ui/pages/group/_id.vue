<template>
  <GroupEditor ref="editor" wallpapersRouterName="index" />
</template>

<script>
export default {
  name: 'GroupGroupEditor',
  layout: 'dashboard',
  beforeRouteLeave(to, from, next) {
    this.$refs.editor.beforeRouteLeave(to, from, next)
  },
}
</script>
