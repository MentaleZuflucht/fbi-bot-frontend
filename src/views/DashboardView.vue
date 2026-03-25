<script setup>
import { ref, onMounted } from 'vue'
import { gql } from '../lib/api'

const stats = ref(null)
const loading = ref(true)
const error = ref('')
const days = ref('30')

async function fetchStats() {
  loading.value = true
  error.value = ''
  try {
    const daysVal = days.value ? parseInt(days.value) : null
    const data = await gql(`
      query ServerStats($days: Int) {
        serverStats(days: $days) {
          totalMessages
          totalVoiceTimeHours
          totalActivities
          mostActiveChannelId
          mostCommonActivity
        }
      }
    `, { days: daysVal })
    stats.value = data.serverStats
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-400">Period:</label>
        <select
          v-model="days"
          @change="fetchStats"
          class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="1">24 hours</option>
          <option value="3">3 days</option>
          <option value="7">7 days</option>
          <option value="14">14 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="">All time</option>
        </select>
      </div>
    </div>

    <p v-if="error" class="text-red-400 mb-4">{{ error }}</p>

    <div v-if="loading" class="text-gray-500">Loading...</div>

    <div v-else-if="stats" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p class="text-sm text-gray-400 mb-1">Total Messages</p>
        <p class="text-3xl font-bold">{{ stats.totalMessages.toLocaleString() }}</p>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p class="text-sm text-gray-400 mb-1">Voice Time</p>
        <p class="text-3xl font-bold">{{ stats.totalVoiceTimeHours.toFixed(1) }}h</p>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p class="text-sm text-gray-400 mb-1">Activities Logged</p>
        <p class="text-3xl font-bold">{{ stats.totalActivities.toLocaleString() }}</p>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p class="text-sm text-gray-400 mb-1">Most Active Channel</p>
        <p class="text-xl font-semibold font-mono truncate">{{ stats.mostActiveChannelId || '—' }}</p>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p class="text-sm text-gray-400 mb-1">Most Common Activity</p>
        <p class="text-xl font-semibold truncate">{{ stats.mostCommonActivity || '—' }}</p>
      </div>
    </div>
  </div>
</template>
