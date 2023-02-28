<template>
    <div>
        <NConfigProvider :theme="darkTheme">
            <NGlobalStyle />
            <div>
                Nuxt module playground!
                <NButton>Default</NButton>
            </div>
        </NConfigProvider>
        建设中
    </div>
</template>
<script setup lang="ts">
import { darkTheme } from 'naive-ui'
</script>