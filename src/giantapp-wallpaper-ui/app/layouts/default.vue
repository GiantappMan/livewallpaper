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
    if (state === 'Maximized') {
        isMaximized.value = true
    } else {
        isMaximized.value = false
    }
})
</script>

<template>
    <div :class="{ 'fixed inset-0 z-50': isMaximized }" class="select-none flex flex-col h-screen">
        <div class="flex justify-between items-center px-3 py-2" style="-webkit-app-region: drag">
            <div class="font-bold">窗口标题</div>
            <div class="flex">
                <UButton @click="shellApi.minimizeWindow" variant="ghost" icon="i-heroicons-minus-solid" color="gray" />
                <UButton @click="toggleMaximize" variant="ghost"
                    :icon="isMaximized ? 'i-heroicons-square-2-stack' : 'i-heroicons-stop'" color="gray" />
                <UButton @click="shellApi.closeWindow" variant="ghost" icon="i-heroicons-x-mark-solid" color="gray" />
            </div>
        </div>
        <div class="flex flex-grow overflow-hidden">
            <aside v-if="isSidebarOpen" class="w-64 p-4 overflow-y-auto">
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
            <div class="flex-grow flex flex-col overflow-hidden">
                <button @click="toggleSidebar" class="mb-4 px-2 py-1 bg-blue-500 text-white rounded">
                    {{ isSidebarOpen ? '隐藏侧边栏' : '显示侧边栏' }}
                </button>
                <UMain class="flex-grow overflow-y-auto">
                    <slot />
                </UMain>
            </div>
        </div>
    </div>
</template>
