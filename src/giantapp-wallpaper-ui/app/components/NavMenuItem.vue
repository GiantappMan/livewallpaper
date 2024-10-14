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
    <NuxtLink :prefetch="false" :title="name" :to="href" :class="[
        current ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent hover:text-primary',
        'relative group w-full p-2 rounded-md flex flex-col items-center text-xs font-medium'
    ]" :aria-current="current ? 'page' : undefined">
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
            ]" aria-hidden="true" />
            <!-- 选中 -->
            <UIcon :name="$props.selectedIcon" :class="[
                'h-6 w-6 transition-all duration-300 text-primary',
                current ? 'translate-y-2 opacity-100' : 'opacity-0'
            ]" aria-hidden="true" />
        </div>
        <span :class="[
            'transition-all duration-300 whitespace-nowrap',
            current ? 'translate-y-2 opacity-0' : 'opacity-100'
        ]">
            {{ name }}
        </span>
    </NuxtLink>
</template>
