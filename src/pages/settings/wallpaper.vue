<template>
    <div class="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:py-12 lg:px-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-200">壁纸</h1>

        <div class="divide-y-blue-gray-200 mt-6 space-y-8 divide-y">
            <div class="grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-6">
                <div class="sm:col-span-6">
                    <h2 class="text-xl font-medium text-gray-200">壁纸位置</h2>
                    <p class="mt-1 text-sm text-gray-300">支持从多个路径读取壁纸，保存时会按顺序查找第一个可用目录。</p>
                </div>

                <div class="sm:col-span-6">
                    <n-input-group>
                        <n-button type="error">
                            X
                        </n-button>
                        <n-input placeholder="D:\Livewallpaper" />
                        <n-button type="primary">
                            选择
                        </n-button>
                    </n-input-group>
                </div>
                <n-button class="text-white" type="primary">添加</n-button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { invoke } from '@tauri-apps/api/tauri'
onMounted(async () => {
    var test = await invoke("load_config", {
        "configType": "wallpaper"
    });
    console.log(test);
});

</script>