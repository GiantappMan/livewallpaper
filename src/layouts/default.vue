<template>
    <div class="flex h-screen">
        <div class="flex w-[74px] overflow-y-auto bg-zinc-900">
            <div class="flex flex-1 w-full flex-col items-center">
                <div class="w-full flex-1 space-y-1 px-1">
                    <NavMenu v-for="item in sidebarTopNavigation" :key="item.name" :to="item.href" :name="item.name"
                        :icon="item.icon" :selected-icon="item.selectedIcon" :current="item.current" />
                </div>
                <div class="w-full px-1 mb-1">
                    <NavMenu v-for="item in sidebarBottomNavigation" :key="item.name" :to="item.href" :name="item.name"
                        :icon="item.icon" :selected-icon="item.selectedIcon" :current="item.current" />
                </div>
            </div>
        </div>

        <!-- Content area -->
        <div class="flex flex-1 flex-col overflow-hidden bg-neutral-800 ml-1 rounded-l-lg">
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

import {
    CogIcon as solidCogIcon,
    HomeIcon as solidHomeIcon,
    Squares2X2Icon as solidSquares2X2Icon,
} from '@heroicons/vue/24/solid'
import NavMenu from '~/components/NavMenu.vue';

const sidebarTopNavigation = reactive([
    { name: '本地壁纸', href: '/', icon: HomeIcon, selectedIcon: solidHomeIcon, current: false },
    { name: '社区', href: '/community', icon: Squares2X2Icon, selectedIcon: solidSquares2X2Icon, current: false },
])

const sidebarBottomNavigation = reactive([
    { name: '设置', href: '/settings', icon: CogIcon, selectedIcon: solidCogIcon, current: false },
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