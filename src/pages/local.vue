<template>
    <n-spin :show="loading">
        <div>
            local
            <div v-for="item in wallpapers" @click="show(item)">
                {{ item.path }}
                {{ item.busy }}
            </div>
        </div>
    </n-spin>
</template>
<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/tauri'
class Wallpaper {
    path: string = "";
    busy: boolean = false;
}
const wallpapers = ref<Wallpaper[]>();
const message = useMessage()
const loading = ref(false);

async function show(item: Wallpaper) {
    try {
        item.busy = true;
        await invoke("wallpaper_open", {
            param: { path: item.path }
        });
    }
    catch (error) {
        console.log(error);
        message.error(error as string, {
            closable: true,
            duration: 5000
        })
    }
    finally {
        item.busy = false;
    }
}

onMounted(async () => {
    try {
        loading.value = true;
        wallpapers.value = await invoke("wallpaper_get_list");
    }
    catch (error) {
        console.log(error);
        message.error(error as string, {
            closable: true,
            duration: 5000
        })
    }
    finally {
        loading.value = false;
    }
});

</script>