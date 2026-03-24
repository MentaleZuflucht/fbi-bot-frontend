<template>
  <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-600 dark:text-slate-400">{{ title }}</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-2">{{ value }}</p>
      </div>
      <div class="text-4xl">{{ icon }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  icon: string
}>()
</script>
