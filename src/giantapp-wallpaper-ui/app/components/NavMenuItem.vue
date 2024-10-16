<script setup lang="ts">
interface Props {
    name?: string;
    href: string;
    icon: string;
    selectedIcon: string;
    current?: boolean;
}

defineProps<Props>();
</script>

<template>
    <NuxtLink :title="name" :to="href" :class="[
        current ? 'bg-gray-50 dark:bg-gray-800' : '',
        'relative group w-full p-2 rounded-md flex flex-col items-center text-xs font-medium hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
    ]">
        <div :class="[
            'transition-all duration-300',
            current ? 'opacity-1' : 'opacity-0',
            'w-1 my-4 bg-primary absolute left-0 inset-y-0'
        ]">
            <!-- 左边条 -->
        </div>
        <div>
            <!-- 未选中 -->
            <UIcon :name="$props.icon" :class="[
                'h-6 w-6 transition-all duration-300 absolute',
                current ? 'translate-y-2 opacity-0' : 'opacity-100'
            ]" />
            <!-- 选中 -->
            <UIcon :name="$props.selectedIcon" :class="[
                'h-6 w-6 transition-all duration-300 text-primary',
                current ? 'translate-y-2 opacity-100' : 'opacity-0'
            ]" />
        </div>
        <span :class="[
            'transition-all duration-300 whitespace-nowrap',
            current ? 'translate-y-2 opacity-0' : 'opacity-100'
        ]">
            {{ name }}
        </span>
    </NuxtLink>
</template>
