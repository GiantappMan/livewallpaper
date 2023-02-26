<template>
    <div class="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:py-12 lg:px-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-200">壁纸</h1>

        <div class="divide-y-blue-gray-200 mt-6 space-y-8 divide-y">
            <div class="grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-6">
                <div class="sm:col-span-6">
                    <h2 class="text-xl font-medium text-gray-200">壁纸位置</h2>
                    <p class="mt-1 text-sm text-gray-300">支持从多个路径读取壁纸，保存时会按顺序查找第一个可用目录。</p>
                </div>

                <div class="sm:col-span-6">
                    <input type="text" name="url" id="url"
                        class="mt-1 block w-full rounded-md border-blue-gray-300 text-blue-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>
                <button class="text-white">添加</button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">

</script>