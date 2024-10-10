<script lang="ts" setup>
const runtimeConfig = useRuntimeConfig();
</script>
<template>
    <iframe :allowFullScreen="true" :class="['w-full', 'min-h-[100vh]']" :src="runtimeConfig.public.HUB_Address" />
</template>