<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gql } from '../lib/api'

const router = useRouter()

const startDate = ref('')
const endDate = ref('')
const activePreset = ref(30)
const loading = ref(true)
const error = ref('')
const connections = ref([])

function setPreset(days) {
  activePreset.value = days
  if (days === null) {
    startDate.value = ''
    endDate.value = ''
  } else {
    const d = new Date()
    endDate.value = d.toISOString().split('T')[0]
    d.setDate(d.getDate() - days)
    startDate.value = d.toISOString().split('T')[0]
  }
  fetchConnections()
}

function onDateChange() {
  activePreset.value = null
  fetchConnections()
}

function buildDateVars() {
  const vars = {}
  if (startDate.value) vars.startDate = startDate.value
  if (endDate.value) vars.endDate = endDate.value
  return vars
}

async function fetchConnections() {
  loading.value = true
  error.value = ''
  try {
    const vars = { limit: 50, ...buildDateVars() }
    const data = await gql(`
      query VoiceConnections($limit: Int, $startDate: String, $endDate: String) {
        voiceConnections(limit: $limit, startDate: $startDate, endDate: $endDate) {
          user1Id
          user1Name
          user2Id
          user2Name
          sharedHours
          sessionCount
        }
      }
    `, vars)
    connections.value = data.voiceConnections
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function formatHours(h) {
  if (h == null || h === 0) return '0h'
  if (h < 1) return `${Math.round(h * 60)}m`
  return `${h.toFixed(1)}h`
}

const maxHours = computed(() => {
  if (!connections.value.length) return 1
  return connections.value[0].sharedHours || 1
})

setPreset(30)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold">Voice Dating</h1>
        <p class="text-sm text-gray-400 mt-1">Who spends the most time together in voice channels</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <input
            type="date"
            v-model="startDate"
            @change="onDateChange"
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span class="text-gray-500 text-sm">to</span>
          <input
            type="date"
            v-model="endDate"
            @change="onDateChange"
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div class="flex gap-1">
          <button
            v-for="p in [{d:7,l:'7d'},{d:14,l:'14d'},{d:30,l:'30d'},{d:90,l:'90d'},{d:365,l:'1y'},{d:null,l:'All'}]"
            :key="p.l"
            @click="setPreset(p.d)"
            class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
            :class="activePreset === p.d ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
          >{{ p.l }}</button>
        </div>
      </div>
    </div>

    <p v-if="error" class="text-red-400 mb-4">{{ error }}</p>
    <div v-if="loading" class="text-gray-500">Loading...</div>

    <template v-else>
      <div v-if="!connections.length" class="text-gray-500 py-8 text-center">
        No voice dating data found for this period.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="(conn, i) in connections"
          :key="`${conn.user1Id}-${conn.user2Id}`"
          class="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors"
        >
          <span class="text-gray-500 text-sm w-8 text-right shrink-0 font-medium">{{ i + 1 }}</span>

          <div class="flex items-center gap-3 flex-1 min-w-0">
            <button
              @click="router.push(`/users/${conn.user1Id}`)"
              class="text-sm font-medium text-indigo-400 hover:text-indigo-300 truncate transition-colors"
            >{{ conn.user1Name }}</button>

            <span class="text-gray-600 shrink-0">&amp;</span>

            <button
              @click="router.push(`/users/${conn.user2Id}`)"
              class="text-sm font-medium text-indigo-400 hover:text-indigo-300 truncate transition-colors"
            >{{ conn.user2Name }}</button>
          </div>

          <div class="flex items-center gap-4 shrink-0">
            <div class="w-32 bg-gray-800 rounded-full h-2.5 hidden sm:block">
              <div
                class="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all"
                :style="{ width: (conn.sharedHours / maxHours * 100) + '%' }"
              ></div>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-white">{{ formatHours(conn.sharedHours) }}</p>
              <p class="text-xs text-gray-500">{{ conn.sessionCount }} overlap{{ conn.sessionCount !== 1 ? 's' : '' }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
