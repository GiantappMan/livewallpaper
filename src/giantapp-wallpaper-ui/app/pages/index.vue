<script setup lang="ts">
import { ref, onMounted } from 'vue'
import clientApi from '~/utils/client/client-api'
import { Wallpaper } from '~/utils/client/types/wallpaper';

const wallpapers = ref<Wallpaper[]>([])
const isLoading = ref(true)

const getWallpapers = async () => {
    isLoading.value = true
    const startTime = Date.now();
    const result = await clientApi.getWallpapers();
    if (result.error === null && result.data) {
        wallpapers.value = result.data;
    }
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime < 300) {
        await new Promise(resolve => setTimeout(resolve, 300 - elapsedTime));
    }
    isLoading.value = false
}

onMounted(() => {
    getWallpapers()
})
</script>

<template>
    <!-- 加载中 -->
    <div v-if="isLoading"
        class="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-y-auto max-h-[100vh] pb-20 h-full">
        <div v-for="i in 12" :key="i" class="flex flex-col space-y-3">
            <USkeleton class="h-[180px] rounded-xl" />
            <div class="space-y-2">
                <USkeleton class="h-4 w-4/5" />
                <USkeleton class="h-4 w-3/5" />
            </div>
        </div>
    </div>
    <!-- 加载完成 -->
    <div v-else
        class="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-y-auto max-h-[100vh] pb-20 h-ful">
        <!-- 壁纸item -->
        <div v-for="(wallpaper, index) in wallpapers" :key="index">
            <div v-if="wallpaper?.fileUrl"
                class="relative group rounded overflow-hidden shadow-lg transform transition duration-500 hover:scale-105">
                <div class="relative cursor-pointer">
                    <picture>
                        <img :alt="wallpaper?.meta.title" class="w-full" height="200"
                            :src="wallpaper?.coverUrl || wallpaper?.fileUrl || '/wp-placeholder.webp'" :style="{
                                aspectRatio: '300/200',
                                objectFit: 'cover',
                            }" width="300" />
                    </picture>
                </div>

                <div class="px-6 pl-0 py-4">
                    <div class="flex font-bold text-sm mb-2 lg:text-xl items-center">
                        <WallpaperTypeIcon :type="wallpaper.meta.type" />
                        {{ wallpaper?.meta?.title }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
