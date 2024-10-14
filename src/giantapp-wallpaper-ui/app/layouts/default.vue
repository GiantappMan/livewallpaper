<script setup lang="ts">
import shellApi from '~/utils/client/shell';

const isMaximized = ref(false)

const toggleMaximize = () => {
    isMaximized.value = !isMaximized.value
    if (isMaximized.value) {
        shellApi.maximizeWindow()
    } else {
        shellApi.restoreWindow()
    }
}


shellApi.hideLoading();
shellApi.onWindowStateChanged((state) => {
    if (state === 'Maximized') {
        isMaximized.value = true
    } else {
        isMaximized.value = false
    }
})
</script>

<template>
    <div :class="{ 'fixed inset-0 z-50': isMaximized }" class="select-none flex flex-col h-screen">
        <div class="flex justify-between  items-start h-12" style="-webkit-app-region: drag">
            <div class="text-xs text-gray-400 flex items-center h-full mx-3">
                <img src="/logo.png" alt="Logo" class="h-6 mr-4" /> <!-- 添加logo图片 -->
                巨应壁纸3-Beta
            </div>
            <div class="flex">
                <UButton @click="shellApi.minimizeWindow" variant="ghost" icon="i-heroicons-minus-solid" color="gray" />
                <UButton @click="toggleMaximize" variant="ghost"
                    :icon="isMaximized ? 'i-heroicons-square-2-stack' : 'i-heroicons-stop'" color="gray" />
                <UButton @click="shellApi.closeWindow" variant="ghost" icon="i-heroicons-x-mark-solid" color="gray" />
            </div>
        </div>
        <div class="flex flex-grow overflow-hidden">
            <SideMenu />
            <div class="flex-grow flex flex-col overflow-hidden">
                <UMain class="flex-grow overflow-y-auto">
                    <slot />
                </UMain>
            </div>
        </div>
    </div>
</template>
