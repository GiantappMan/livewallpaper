<template>
    <div class="flex min-h-screen">
        <div class="flex w-[74px] overflow-y-auto bg-app-dark-900">
            <div class="flex flex-1 w-full flex-col items-center py-2">
                <div class="w-full flex-1 space-y-1 px-2">
                    <nuxt-link v-for="item in sidebarTopNavigation" :key="item.name" :to="item.href"
                        :class="[item.current ? 'bg-app-theme-50 text-white' : 'text-indigo-100 hover:bg-app-theme-50 hover:text-white', 'group w-full p-3 rounded-md flex flex-col items-center text-xs font-medium']"
                        :aria-current="item.current ? 'page' : undefined">
                        <component :is="item.icon"
                            :class="[item.current ? 'text-white' : 'text-indigo-300 group-hover:text-white', 'h-6 w-6']"
                            aria-hidden="true" />
                        <span class="mt-2">{{ item.name }}</span>
                    </nuxt-link>
                </div>
                <div class="w-full px-2">
                    <nuxt-link v-for="item in sidebarBottomNavigation" :key="item.name" :to="item.href"
                        :class="[item.current ? 'bg-app-theme-50 text-white' : 'text-indigo-100 hover:bg-app-theme-50 hover:text-white', 'group w-full p-3 rounded-md flex flex-col items-center text-xs font-medium']"
                        :aria-current="item.current ? 'page' : undefined">
                        <component :is="item.icon"
                            :class="[item.current ? 'text-white' : 'text-indigo-300 group-hover:text-white', 'h-6 w-6']"
                            aria-hidden="true" />
                        <span class="mt-2">{{ item.name }}</span>
                    </nuxt-link>
                </div>
            </div>
        </div>

        <!-- Content area -->
        <div class="flex flex-1 flex-col overflow-hidden bg-content-bg">
            <!-- Main content -->
            <div class="flex flex-1 items-stretch overflow-hidden">
                <slot>
                    <main class="flex-1 overflow-y-auto">
                        <!-- Primary column -->
                        <section aria-labelledby="primary-heading"
                            class="flex h-full min-w-0 flex-1 flex-col lg:order-last">
                            <h1 id="primary-heading" class="sr-only">Photos</h1>
                            <!-- Your content -->
                        </section>
                    </main>

                    <!-- Secondary column (hidden on smaller screens) -->
                    <aside class="hidden w-96 overflow-y-auto border-l border-gray-200 bg-white lg:block">
                    </aside>
                </slot>
            </div>
        </div>
    </div>
</template>
  
<script setup lang="ts">

import {
    CogIcon,
    HomeIcon,
    Squares2X2Icon,
} from '@heroicons/vue/24/outline'

const sidebarTopNavigation = reactive([
    { name: 'Local', href: '/', icon: HomeIcon, current: false },
    { name: 'Community', href: '/community', icon: Squares2X2Icon, current: false },
])

const sidebarBottomNavigation = reactive([
    { name: 'Settings', href: '/settings', icon: CogIcon, current: false },
])

const route = useRoute()
const updateActive = () => {
    sidebarTopNavigation.forEach((item) => {
        item.current = route.path === item.href;
    });
    sidebarBottomNavigation.forEach((item) => {
        item.current = route.path === item.href;
    });
}

watch(() => route.params, () => {
    updateActive()
}, { immediate: true });
</script>