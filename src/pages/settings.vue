<template>
    <div class="flex w-full h-full flex-row overflow-hidden">
        <nav aria-label="Sections" class="w-96 flex-shrink-0 border-r border-black flex flex-col">
            <div class="flex h-16 flex-shrink-0 items-center border-b border-black px-6">
                <p class="text-lg font-medium text-gray-200">设置</p>
            </div>
            <div class="h-full  flex-1 overflow-y-auto">
                <NuxtLink v-for="item in subNavigation" :key="item.name" :to="item.href"
                    :class="[item.current ? 'bg-blue-600 bg-opacity-50' : 'hover:bg-blue-50 hover:bg-opacity-50', 'flex p-6 border-b border-black']"
                    :aria-current="item.current ? 'page' : undefined">
                    <div class="ml-3 text-sm">
                        <p class="font-medium text-gray-300">{{ item.name }}</p>
                    </div>
                </NuxtLink>
            </div>
        </nav>

        <div class="flex-1 overflow-y-auto">
            <NuxtPage />
        </div>
    </div>
</template>
  
<script setup lang="ts">

const subNavigation = reactive([
    {
        name: '常规',
        href: '/settings/general',
        current: false,
    },
    {
        name: '壁纸',
        href: '/settings/wallpaper',
        current: false,
    }
]);

const route = useRoute()
const updateActive = () => {
    subNavigation.forEach((item) => {
        item.current = route.path === item.href;
    });
}

watch(() => route.params, () => {
    updateActive()
}, { immediate: true });

</script>