<script setup>
defineProps({
  // 0-based
  page: { type: Number, required: true },
  hasNext: { type: Boolean, default: false },
})
defineEmits(['change'])
</script>

<template>
  <div v-if="page > 0 || hasNext" class="flex items-center justify-center gap-3 py-4 text-sm">
    <button
      :disabled="page === 0"
      @click="$emit('change', page - 1)"
      class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
    >
      Previous
    </button>
    <span class="text-gray-400">Page {{ page + 1 }}</span>
    <button
      :disabled="!hasNext"
      @click="$emit('change', page + 1)"
      class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
    >
      Next
    </button>
  </div>
</template>
