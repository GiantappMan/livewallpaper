<template>
  <div class="empty">
    <div>
      <b-icon :pack="pack" :icon="icon" size="is-large"> </b-icon>
    </div>
    <p><slot> </slot></p>
  </div>
</template>
<script>
export default {
  props: ['pack', 'icon'],
}
</script>
<style scoped>
.empty {
  display: -webkit-box;
  display: -webkit-flex;
  display: flex;
  -webkit-box-orient: vertical;
  -webkit-box-direction: normal;
  -webkit-flex-direction: column;
  flex-direction: column;
  -webkit-box-align: center;
  -webkit-align-items: center;
  align-items: center;
  -webkit-box-pack: center;
  -webkit-justify-content: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 32px 0;
}
</style>