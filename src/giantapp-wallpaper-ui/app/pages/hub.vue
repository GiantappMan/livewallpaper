<script lang="ts" setup>
const runtimeConfig = useRuntimeConfig();
</script>
<template>
    <iframe :allowFullScreen="true" class="w-full " :src="runtimeConfig.public.HUB_Address" />
</template>