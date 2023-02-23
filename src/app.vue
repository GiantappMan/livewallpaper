<template>
  <div>
    <NuxtLayout>
      <NuxtLink to="/">Home</NuxtLink>
      <NuxtLink to="/settings">Settings</NuxtLink>
      <NuxtLink to="/local">Local</NuxtLink>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
<script lang="ts" setup>

onMounted(async () => {
  console.log("mounted");
  const appWindow = (await import('@tauri-apps/api/window')).appWindow
  appWindow.show();
});
</script>