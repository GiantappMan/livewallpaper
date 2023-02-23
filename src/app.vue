<template>
  <NuxtLayout>
    <!-- <NuxtLoadingIndicator color="#2563eb" /> -->
    <NuxtPage />
  </NuxtLayout>
</template>
<script lang="ts" setup>

onMounted(async () => {
  console.log("mounted");
  const appWindow = (await import('@tauri-apps/api/window')).appWindow
  appWindow.show();
});
</script>
<style>
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-thumb {
  background-color: #9f9f9f;
  border-radius: 10px;
}

::-webkit-scrollbar-track {
  background-color: #262626;
  border-radius: 10px;
}
</style>