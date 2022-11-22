<template>
    <div class="flex min-h-screen">
        <div class="flex w-28 overflow-y-auto bg-indigo-700">
            <div class="flex flex-1 w-full flex-col items-center py-6">
                <div class="flex flex-shrink-0 items-center">
                    <img class="h-8 w-auto" src="~/assets/img/logo.png" alt="Live Wallpaper 3" />
                </div>
                <div class="mt-6 w-full flex-1 space-y-1 px-2">
                    <nuxt-link v-for="item in sidebarTopNavigation" :key="item.name" :to="item.href"
                        :class="[item.current ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-800 hover:text-white', 'group w-full p-3 rounded-md flex flex-col items-center text-xs font-medium']"
                        :aria-current="item.current ? 'page' : undefined">
                        <component :is="item.icon"
                            :class="[item.current ? 'text-white' : 'text-indigo-300 group-hover:text-white', 'h-6 w-6']"
                            aria-hidden="true" />
                        <span class="mt-2">{{ item.name }}</span>
                    </nuxt-link>
                </div>
                <div class="w-full px-2">
                    <nuxt-link v-for="item in sidebarBottomNavigation" :key="item.name" :to="item.href"
                        :class="[item.current ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-800 hover:text-white', 'group w-full p-3 rounded-md flex flex-col items-center text-xs font-medium']"
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
        <div class="flex flex-1 flex-col overflow-hidden">
            <header class="w-full">
                <div class="relative z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
                    <button type="button"
                        class="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
                        @click="mobileMenuOpen = true">
                        <span class="sr-only">Open sidebar</span>
                        <Bars3BottomLeftIcon class="h-6 w-6" aria-hidden="true" />
                    </button>
                    <div class="flex flex-1 justify-between px-4 sm:px-6">
                        <div class="flex flex-1">
                            <form class="flex w-full md:ml-0" action="#" method="GET">
                                <label for="search-field" class="sr-only">Search all files</label>
                                <div class="relative w-full text-gray-400 focus-within:text-gray-600">
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                                        <MagnifyingGlassIcon class="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                                    </div>
                                    <input name="search-field" id="search-field"
                                        class="h-full w-full border-transparent py-2 pl-8 pr-3 text-base text-gray-900 placeholder-gray-500 focus:border-transparent focus:placeholder-gray-400 focus:outline-none focus:ring-0"
                                        placeholder="Search" type="search" />
                                </div>
                            </form>
                        </div>
                        <div class="ml-2 flex items-center space-x-4 sm:ml-6 sm:space-x-6">
                            <!-- Profile dropdown -->
                            <Menu as="div" class="relative flex-shrink-0">
                                <div>
                                    <MenuButton
                                        class="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                                        <span class="sr-only">Open user menu</span>
                                        <img class="h-8 w-8 rounded-full"
                                            src="https://images.unsplash.com/photo-1517365830460-955ce3ccd263?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=256&h=256&q=80"
                                            alt="" />
                                    </MenuButton>
                                </div>
                                <transition enter-active-class="transition ease-out duration-100"
                                    enter-from-class="transform opacity-0 scale-95"
                                    enter-to-class="transform opacity-100 scale-100"
                                    leave-active-class="transition ease-in duration-75"
                                    leave-from-class="transform opacity-100 scale-100"
                                    leave-to-class="transform opacity-0 scale-95">
                                    <MenuItems
                                        class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        <MenuItem v-for="item in userNavigation" :key="item.name" v-slot="{ active }">
                                        <a :href="item.href"
                                            :class="[active ? 'bg-gray-100' : '', 'block px-4 py-2 text-sm text-gray-700']">{{
        item.name
                                            }}</a>
                                        </MenuItem>
                                    </MenuItems>
                                </transition>
                            </Menu>

                            <button type="button"
                                class="flex items-center justify-center rounded-full bg-indigo-600 p-1 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                                <PlusIcon class="h-6 w-6" aria-hidden="true" />
                                <span class="sr-only">Add file</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

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
                        <!-- Your content -->
                    </aside>
                </slot>
            </div>
        </div>
    </div>
</template>
  
<script setup lang="ts">
import { ref } from 'vue'
import {
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
} from '@headlessui/vue'
import {
    Bars3BottomLeftIcon,
    CogIcon,
    HomeIcon,
    PlusIcon,
    Squares2X2Icon,
} from '@heroicons/vue/24/outline'
import { MagnifyingGlassIcon } from '@heroicons/vue/20/solid'

const sidebarTopNavigation = [
    { name: 'Local', href: '/', icon: HomeIcon, current: false },
    { name: 'Community', href: '/community', icon: Squares2X2Icon, current: false },
]

const sidebarBottomNavigation = [
    { name: 'Settings', href: '/settings', icon: CogIcon, current: false },
]
const userNavigation = [
    { name: 'Your Profile', href: '#' },
    { name: 'Sign out', href: '#' },
]

const mobileMenuOpen = ref(false)
</script>