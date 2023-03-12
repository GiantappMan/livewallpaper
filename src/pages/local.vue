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
const message = useMessage()

onMounted(async () => {
    try {
        wallpapers.value = await invoke("get_wallpapers");
    }
    catch (error) {
        console.log(error);
        message.error(error as string, {
            closable: true,
            duration: 5000
        })
    }
});

</script>