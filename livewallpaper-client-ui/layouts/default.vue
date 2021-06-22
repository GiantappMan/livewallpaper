<template>
  <div>
    <Header :stick="false" />
    <main>
      <Nuxt />
    </main>
    <Footer :copyright="true" :github="true" :beian="true" />
  </div>
</template>

<script>
export default {
  data() {
    return {}
  },
}
</script>
