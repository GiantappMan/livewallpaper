<template>
    <n-spin :show="loading">
        <div class="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:py-12 lg:px-8">
            <h1 class="text-3xl font-bold tracking-tight text-gray-200">壁纸</h1>
            <div class="divide-y-blue-gray-200 mt-6 space-y-8 divide-y">
                <div class="grid grid-cols-1 gap-y-6">
                    <div class="col-span-6">
                        <h2 class="text-xl font-medium text-gray-200">壁纸位置</h2>
                        <p class="mt-1 text-sm text-gray-300">支持从多个路径读取壁纸，保存时会按顺序查找第一个可用目录。</p>
                    </div>
                    <div class="col-span-6">
                        <n-input-group v-if="config" v-for="(item, index) in config.paths" class="mb-1">
                            <n-button type="info" @click="removePath(index)">
                                Move
                            </n-button>
                            <n-input placeholder="D:\Livewallpaper" v-model:value="config.paths[index]"
                                @blur="saveConfig" />
                            <n-button type="error" @click="removePath(index)">
                                X
                            </n-button>
                        </n-input-group>
                    </div>
                </div>
                <n-button class="text-white" type="primary" @click="choosePath()">添加目录</n-button>
            </div>
        </div>
    </n-spin>
</template>
<script setup lang="ts">
import { invoke } from '@tauri-apps/api/tauri'
import { open, save } from '@tauri-apps/api/dialog';
class WallpaperConfig {
    constructor(init?: Partial<WallpaperConfig>) {
        if (init)
            Object.assign(this, init);
    }
    paths: string[] = [];
}
let _originalConfig: WallpaperConfig | undefined;
const loading = ref(false);
const config = ref<WallpaperConfig>();
const message = useMessage()

async function loadConfig() {
    loading.value = true;
    try {
        _originalConfig = await invoke("settings_load_wallpaper");
        //deep copy
        config.value = new WallpaperConfig(JSON.parse(JSON.stringify(_originalConfig)));
    } catch (error) {
        console.log(error);
        message.error(error as string, {
            closable: true,
            duration: 5000
        })
    } finally {
        loading.value = false;
    }
}

async function saveConfig() {
    //paths去重
    if (config.value) {
        config.value.paths = config.value.paths.filter((item, index) => {
            return config.value?.paths.indexOf(item) == index;
        });
    }

    if (JSON.stringify(config.value) == JSON.stringify(_originalConfig)) {
        return;
    }

    try {
        loading.value = true;
        config.value = await invoke("settings_save_wallpaper", { config: config.value });
        message.success("已保存", {
            duration: 800
        })
        _originalConfig = new WallpaperConfig(JSON.parse(JSON.stringify(config.value)));
    } catch (error) {
        console.log(error);
        message.error(error as string, {
            closable: true,
            duration: 5000
        })
    } finally {
        loading.value = false;
    }
}

async function removePath(index: number) {
    config.value?.paths.splice(index, 1);
    await saveConfig();
}

async function choosePath() {
    if (!config.value)
        return;

    const selected = await open({
        directory: true,
    });
    if (selected) {
        config.value.paths.push(selected as string);
        await saveConfig();
    }
}

onMounted(async () => {
    await loadConfig();
});

</script>