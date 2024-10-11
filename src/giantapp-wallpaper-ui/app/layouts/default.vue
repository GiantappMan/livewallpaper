<script setup lang="ts">
import shellApi from '~/utils/client/shell';

const isMaximized = ref(false)
const isSidebarOpen = ref(true)

const toggleMaximize = () => {
    isMaximized.value = !isMaximized.value
    if (isMaximized.value) {
        shellApi.maximizeWindow()
    } else {
        shellApi.restoreWindow()
    }
}

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value
}

shellApi.hideLoading();
shellApi.onWindowStateChanged((state) => {
    if (state === 'maximized') {
        isMaximized.value = true
    } else {
        isMaximized.value = false
    }
})
</script>

<template>
    <div :class="{ 'fixed inset-0 z-50': isMaximized }">
        <div class="flex justify-between items-center px-3 py-2">
            <div class="font-bold">窗口标题</div>
            <div class="flex">
                <button @click="shellApi.minimizeWindow" class="text-lg ml-2 hover:bg-gray-300 px-1">-</button>
                <button @click="toggleMaximize" class="text-lg ml-2 hover:bg-gray-300 px-1">□</button>
                <button @click="shellApi.closeWindow"
                    class="text-lg ml-2 hover:bg-red-500 hover:text-white px-1">×</button>
            </div>
        </div>
        <div class="flex">
            <aside class="w-64 p-4" v-if="isSidebarOpen">
                <nav>
                    <ul>
                        <li class="mb-2">
                            <NuxtLink href="/" class="text-blue-600 hover:underline">本地</NuxtLink>
                        </li>
                        <li class="mb-2">
                            <NuxtLink href="/hub" class="text-blue-600 hover:underline">社区</NuxtLink>
                        </li>
                    </ul>
                </nav>
            </aside>
            <div class="flex-grow p-4">
                <button @click="toggleSidebar" class="mb-4 px-2 py-1 bg-blue-500 text-white rounded">
                    {{ isSidebarOpen ? '隐藏侧边栏' : '显示侧边栏' }}
                </button>
                <UMain>
                    <slot />
                </UMain>
            </div>
        </div>
    </div>
</template>
