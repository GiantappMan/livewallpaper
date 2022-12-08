<template>
    <nuxt-link :to="props.href"
        :class="[props.current ? 'bg-stone-700 text-white' : 'text-gray-400 hover:bg-zinc-800 hover:text-white', 'relative group w-full p-2 rounded-md flex flex-col items-center text-xs font-medium']"
        :aria-current="props.current ? 'page' : undefined">
        <div
            :class="['transition-al duration-300', props.current ? ' opacity-1' : ' opacity-0', 'w-1 my-4 bg-blue-600 absolute left-0 inset-y-0']">
        </div>
        <div class=" text-gray-400 group-hover:text-white ">
            <component :is="props.icon"
                :class="['h-6 w-6 transition-all duration-300 absolute', props.current ? 'translate-y-2 opacity-0' : 'opacity-100']"
                aria-hidden="true" />
            <component :is="props.selectedIcon"
                :class="['h-6 w-6 transition-all duration-300 text-blue-600', props.current ? 'translate-y-2 opacity-100 ' : 'opacity-0']"
                aria-hidden="true" />
        </div>
        <span :class="['transition-all duration-300', props.current ? 'translate-y-2 opacity-0' : 'opacity-100']">
            {{ props.name }}
        </span>
    </nuxt-link>
</template>
<script lang="ts" setup>
const props = defineProps<{
    name?: string;
    href?: string;
    icon?: any;
    selectedIcon?: any;
    current?: boolean;
}>()

</script>