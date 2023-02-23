<template>
    <div>
        local
        <div v-for="item in wallpapers">
            {{ item.path }}
        </div>
    </div>
</template>
<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/tauri'
const wallpapers = ref<Array<any>>();


onMounted(async () => {
    wallpapers.value = await invoke("get_wallpapers");
});


</script>