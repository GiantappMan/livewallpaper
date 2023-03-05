<template>
    <n-spin :show="loading">
        <div class="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:py-12 lg:px-8">
            <h1 class="text-3xl font-bold tracking-tight text-gray-200">壁纸</h1>

            <div class="divide-y-blue-gray-200 mt-6 space-y-8 divide-y">
                <div class="grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-6">
                    <div class="sm:col-span-6">
                        <h2 class="text-xl font-medium text-gray-200">壁纸位置</h2>
                        <p class="mt-1 text-sm text-gray-300">支持从多个路径读取壁纸，保存时会按顺序查找第一个可用目录。</p>
                    </div>
                    <div class="sm:col-span-6">
                        {{ config }}
                        <n-input-group v-if="config" v-for="(item, index) in config.paths" class="mb-1">
                            <n-button type="error" @click="removePath(index)">
                                X
                            </n-button>
                            <n-input placeholder="D:\Livewallpaper" v-model:value="config.paths[index]" />
                            <n-button type="primary">
                                选择
                            </n-button>
                        </n-input-group>
                    </div>
                    <n-button class="text-white" type="primary" @click="addPath">添加</n-button>
                </div>
            </div>
        </div>
    </n-spin>
</template>
<script setup lang="ts">
import { invoke } from '@tauri-apps/api/tauri'
type WallpaperConfig = {
    paths: Array<string>
}
const loading = ref(false);
const config = ref<WallpaperConfig>();

async function saveConfig() {
    loading.value = true;
    const json = await invoke("save_config", {
        "configType": "wallpaper",
        // "config": JSON.stringify(config.value)
    });
    config.value = JSON.parse(json as string) as WallpaperConfig;
    loading.value = false;
}

async function addPath() {
    config.value?.paths.push("");
    await saveConfig();
}

async function removePath(index: number) {
    config.value?.paths.splice(index, 1);
    await saveConfig();
}

onMounted(async () => {
    loading.value = true;
    const json = await invoke("load_config", {
        "configType": "wallpaper"
    });
    config.value = JSON.parse(json as string) as WallpaperConfig;
    loading.value = false;
});

</script>