<script lang="ts" setup>
import { useRoute } from 'vue-router';

const route = useRoute();

const sidebarTopNavigation = computed(() => [
    {
        name: '本地',
        href: '/',
        icon: 'i-heroicons-home',
        selectedIcon: 'i-heroicons-home-solid',
        current: route.path === '/',
    },
    {
        name: '社区',
        href: '/hub',
        icon: 'i-heroicons-star',
        selectedIcon: 'i-heroicons-star-solid',
        current: route.path === '/hub',
    },
]);

const sidebarBottomNavigation = computed(() => [
    {
        name: '设置',
        href: '/settings',
        icon: 'i-heroicons-cog',
        selectedIcon: 'i-heroicons-cog-solid',
        current: route.path === '/settings',
    },
    {
        name: '关于',
        href: '/about',
        icon: 'i-heroicons-question-mark-circle',
        selectedIcon: 'i-heroicons-question-mark-circle-solid',
        current: route.path === '/about',
    },
]);
</script>

<template>
    <aside class="flex w-[68px] overflow-y-auto overflow-x-clip">
        <div class="flex flex-1 w-full flex-col items-center">
            <div class="w-full flex-1 space-y-1 px-1">
                <NavMenuItem v-for="item in sidebarTopNavigation" :key="item.name" :href="item.href" :name="item.name"
                    :icon="item.icon" :selected-icon="item.selectedIcon" :current="item.current" />
            </div>
            <div class="w-full px-1 mb-1 space-y-1">
                <NavMenuItem v-for="item in sidebarBottomNavigation" :key="item.name" :href="item.href"
                    :name="item.name" :icon="item.icon" :selected-icon="item.selectedIcon" :current="item.current" />
            </div>
        </div>
    </aside>
</template>