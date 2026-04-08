<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { gql } from '../lib/api'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const route = useRoute()
const userId = computed(() => route.params.userId)
const user = ref(null)
const loading = ref(true)
const error = ref('')
const activeTab = ref('overview')

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'messages', label: 'Messages' },
  { id: 'voice', label: 'Voice' },
  { id: 'activities', label: 'Activities' },
  { id: 'presence', label: 'Presence' },
  { id: 'statuses', label: 'Statuses' },
]

// --- Shared date helpers ---
function defaultDateRange(days) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
}

function makeDateVars(start, end) {
  const vars = {}
  if (start) vars.startDate = start
  if (end) vars.endDate = end
  return vars
}

// Shared date range for Messages, Statistics, Voice, Activities, Presence (stays in sync when switching tabs)
const periodStart = ref(defaultDateRange(30).start)
const periodEnd = ref(defaultDateRange(30).end)
/** number of days for preset buttons, or null for "All" / custom range */
const periodPreset = ref(30)

function setPeriodPreset(days) {
  periodPreset.value = days
  if (days === null) {
    periodStart.value = ''
    periodEnd.value = ''
  } else {
    const r = defaultDateRange(days)
    periodStart.value = r.start
    periodEnd.value = r.end
  }
  refetchPeriodForActiveTab()
}

function onPeriodDateChange() {
  periodPreset.value = null
  refetchPeriodForActiveTab()
}

function refetchPeriodForActiveTab() {
  const tab = activeTab.value
  if (tab === 'messages') fetchMessages()
  else if (tab === 'voice') fetchVoice()
  else if (tab === 'activities') fetchActivities()
  else if (tab === 'presence') fetchPresence()
  else if (tab === 'statistics') fetchStats()
}

// --- Messages tab ---
const msgChannel = ref('')
const messages = ref([])
const messagesLoading = ref(false)

// --- Voice tab ---
const voiceChannel = ref('')
const voiceSessions = ref([])
const voiceLoading = ref(false)
const voiceSortBy = ref('date')
const expandedSession = ref(null)
const sessionStates = ref({})
const statesLoading = ref({})

const sortedVoiceSessions = computed(() => {
  const list = [...voiceSessions.value]
  if (voiceSortBy.value === 'duration') {
    list.sort((a, b) => (b.durationMinutes ?? Infinity) - (a.durationMinutes ?? Infinity))
  }
  return list
})

// --- Stats tab ---
const statsData = ref(null)
const statsLoading = ref(false)
const dailyChart = ref(null)
const hourlyChart = ref(null)
let dailyChartInstance = null
let hourlyChartInstance = null

// --- Activities tab ---
const activitiesList = ref([])
const activitiesLoading = ref(false)
const actSortBy = ref('date')

const sortedActivities = computed(() => {
  const list = [...activitiesList.value]
  if (actSortBy.value === 'duration') {
    list.sort((a, b) => (b.durationMinutes ?? Infinity) - (a.durationMinutes ?? Infinity))
  }
  return list
})

// --- Presence tab ---
const presenceList = ref([])
const presenceLoading = ref(false)
const presSortBy = ref('date')
/** '' = all; otherwise matches API statusType (ONLINE, IDLE, OFFLINE) */
const presStatusFilter = ref('')
const presStatusOptions = [
  { value: '', label: 'All' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'IDLE', label: 'Idle' },
  { value: 'OFFLINE', label: 'Offline' },
]

const sortedPresence = computed(() => {
  let list = [...presenceList.value]
  if (presStatusFilter.value) {
    list = list.filter((p) => p.statusType === presStatusFilter.value)
  }
  if (presSortBy.value === 'duration') {
    list.sort((a, b) => (b.durationMinutes ?? Infinity) - (a.durationMinutes ?? Infinity))
  }
  return list
})

// --- Unique Activities ---
const uniqueActivities = ref([])
const uniqueActLoading = ref(false)

// === Data fetching ===

async function fetchUser() {
  loading.value = true
  error.value = ''
  try {
    const data = await gql(`
      query User($userId: String!) {
        user(userId: $userId) {
          userId
          firstSeen
          currentName {
            username
            displayName
            globalName
          }
          stats {
            totalMessages
            totalVoiceTimeMinutes
            totalActivities
            mostActiveHour
            favoriteActivity
            mostUsedChannel
          }
          nameHistory(limit: 10) {
            username
            displayName
            globalName
            effectiveFrom
            effectiveUntil
          }
          customStatuses(limit: 50) {
            id
            statusText
            emoji
            setAt
          }
        }
      }
    `, { userId: userId.value })
    user.value = data.user
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function fetchMessages() {
  messagesLoading.value = true
  try {
    const vars = { userId: userId.value, limit: 100, ...makeDateVars(periodStart.value, periodEnd.value) }
    if (msgChannel.value.trim()) vars.channelId = msgChannel.value.trim()
    const data = await gql(`
      query Messages($userId: String, $limit: Int, $startDate: String, $endDate: String, $channelId: String) {
        messages(userId: $userId, limit: $limit, startDate: $startDate, endDate: $endDate, channelId: $channelId) {
          messageId
          channelId
          messageType
          hasAttachments
          hasEmbeds
          characterCount
          sentAt
        }
      }
    `, vars)
    messages.value = data.messages
  } catch (e) {
    error.value = e.message
  } finally {
    messagesLoading.value = false
  }
}

async function fetchVoice() {
  voiceLoading.value = true
  expandedSession.value = null
  try {
    const vars = { userId: userId.value, limit: 200, ...makeDateVars(periodStart.value, periodEnd.value) }
    if (voiceChannel.value.trim()) vars.channelId = voiceChannel.value.trim()
    const data = await gql(`
      query VoiceSessions($userId: String, $limit: Int, $startDate: String, $endDate: String, $channelId: String) {
        voiceSessions(userId: $userId, limit: $limit, startDate: $startDate, endDate: $endDate, channelId: $channelId) {
          id
          channelId
          joinedAt
          leftAt
          durationMinutes
          isOngoing
          voiceStates {
            id
            stateType
            startedAt
            endedAt
            durationMinutes
          }
        }
      }
    `, vars)
    voiceSessions.value = data.voiceSessions
  } catch (e) {
    error.value = e.message
  } finally {
    voiceLoading.value = false
  }
}

async function fetchActivities() {
  activitiesLoading.value = true
  try {
    const vars = { userId: userId.value, limit: 200, ...makeDateVars(periodStart.value, periodEnd.value) }
    const data = await gql(`
      query Activities($userId: String, $limit: Int, $startDate: String, $endDate: String) {
        activities(userId: $userId, limit: $limit, startDate: $startDate, endDate: $endDate) {
          id
          activityType
          activityName
          startedAt
          endedAt
          durationMinutes
          isOngoing
        }
      }
    `, vars)
    activitiesList.value = data.activities
  } catch (e) {
    error.value = e.message
  } finally {
    activitiesLoading.value = false
  }
}

async function fetchPresence() {
  presenceLoading.value = true
  try {
    const vars = { userId: userId.value, limit: 200, ...makeDateVars(periodStart.value, periodEnd.value) }
    const data = await gql(`
      query Presence($userId: String, $limit: Int, $startDate: String, $endDate: String) {
        presenceStatus(userId: $userId, limit: $limit, startDate: $startDate, endDate: $endDate) {
          id
          statusType
          setAt
          changedAt
          durationMinutes
          isCurrent
        }
      }
    `, vars)
    presenceList.value = data.presenceStatus
  } catch (e) {
    error.value = e.message
  } finally {
    presenceLoading.value = false
  }
}

async function fetchUniqueActivities() {
  uniqueActLoading.value = true
  try {
    const data = await gql(`
      query UniqueActs($userId: String!) {
        user(userId: $userId) {
          uniqueActivities { activityName totalHours count }
        }
      }
    `, { userId: userId.value })
    uniqueActivities.value = data.user?.uniqueActivities || []
  } catch (e) {
    error.value = e.message
  } finally {
    uniqueActLoading.value = false
  }
}

async function fetchStats() {
  statsLoading.value = true
  try {
    const vars = { userId: userId.value, ...makeDateVars(periodStart.value, periodEnd.value) }
    const data = await gql(`
      query UserCharts($startDate: String, $endDate: String, $userId: String) {
        dailyStats(startDate: $startDate, endDate: $endDate, userId: $userId) { date messageCount voiceHours activityCount }
        hourlyMessageDistribution(startDate: $startDate, endDate: $endDate, userId: $userId) { hour count }
        topChannels(startDate: $startDate, endDate: $endDate, userId: $userId, limit: 8) { name count hours }
        topActivities(startDate: $startDate, endDate: $endDate, userId: $userId, limit: 8) { name count hours }
      }
    `, vars)
    statsData.value = data
    statsLoading.value = false

    await nextTick()
    renderCharts()
  } catch (e) {
    error.value = e.message
    statsLoading.value = false
  }
}

function destroyCharts() {
  if (dailyChartInstance) { dailyChartInstance.destroy(); dailyChartInstance = null }
  if (hourlyChartInstance) { hourlyChartInstance.destroy(); hourlyChartInstance = null }
}

onBeforeUnmount(destroyCharts)

function renderCharts() {
  destroyCharts()
  const d = statsData.value
  if (!d) return

  if (dailyChart.value) {
    dailyChartInstance = new Chart(dailyChart.value, {
      type: 'bar',
      data: {
        labels: d.dailyStats.map(s => s.date),
        datasets: [
          { label: 'Messages', data: d.dailyStats.map(s => s.messageCount), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 3, order: 1 },
          { label: 'Voice Hours', data: d.dailyStats.map(s => s.voiceHours), backgroundColor: 'rgba(168,85,247,0.7)', borderRadius: 3, order: 2 },
        ],
      },
      options: chartOptions('Daily Activity'),
    })
  }

  if (hourlyChart.value) {
    hourlyChartInstance = new Chart(hourlyChart.value, {
      type: 'bar',
      data: {
        labels: d.hourlyMessageDistribution.map(h => `${h.hour}:00`),
        datasets: [{ label: 'Messages', data: d.hourlyMessageDistribution.map(h => h.count), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 3 }],
      },
      options: chartOptions('Messages by Hour'),
    })
  }
}

function chartOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ca3af' } },
      title: { display: true, text: title, color: '#e5e7eb' },
    },
    scales: {
      x: { ticks: { color: '#6b7280', maxRotation: 45 }, grid: { color: 'rgba(55,65,81,0.5)' } },
      y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(55,65,81,0.5)' }, beginAtZero: true },
    },
  }
}

// Fix #7: re-render charts when switching back to statistics tab
watch(activeTab, async (tab) => {
  if (tab === 'messages' && !messagesLoading.value) fetchMessages()
  if (tab === 'voice' && !voiceLoading.value) fetchVoice()
  if (tab === 'activities' && !activitiesLoading.value) fetchActivities()
  if (tab === 'presence' && !presenceLoading.value) fetchPresence()
  if (tab === 'statistics') {
    if (!statsLoading.value) {
      await fetchStats()
    } else if (statsData.value) {
      await nextTick()
      renderCharts()
    }
  }
})

function toggleSession(id) {
  expandedSession.value = expandedSession.value === id ? null : id
}

function displayName(u) {
  const n = u.currentName
  if (!n) return u.userId
  return n.globalName || n.displayName || n.username || u.userId
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString()
}

function formatDateShort(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString()
}

function formatDuration(mins) {
  if (mins == null) return 'Ongoing'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatHours(h) {
  if (h == null || h === 0) return '0h'
  if (h < 1) return `${Math.round(h * 60)}m`
  return `${h.toFixed(1)}h`
}

const statusColors = {
  ONLINE: 'text-green-400',
  IDLE: 'text-yellow-400',
  DND: 'text-red-400',
  OFFLINE: 'text-gray-500',
  STREAMING: 'text-purple-400',
}

const stateLabels = {
  DEAF: 'Server Deaf',
  MUTE: 'Server Mute',
  SELF_DEAF: 'Self Deaf',
  SELF_MUTE: 'Self Mute',
  SELF_STREAM: 'Streaming',
  SELF_VIDEO: 'Camera',
}

const stateColors = {
  DEAF: 'text-red-400',
  MUTE: 'text-red-400',
  SELF_DEAF: 'text-orange-400',
  SELF_MUTE: 'text-orange-400',
  SELF_STREAM: 'text-purple-400',
  SELF_VIDEO: 'text-blue-400',
}

onMounted(() => {
  fetchUser()
  fetchUniqueActivities()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <router-link to="/users" class="text-sm text-gray-400 hover:text-white mb-4 inline-block">
      &larr; Back to Users
    </router-link>

    <div v-if="loading" class="text-gray-500 py-8">Loading...</div>
    <p v-else-if="error" class="text-red-400">{{ error }}</p>
    <div v-else-if="!user" class="text-gray-500 py-8">User not found</div>

    <template v-else>
      <div class="mb-8">
        <h1 class="text-2xl font-bold">{{ displayName(user) }}</h1>
        <div class="flex gap-4 mt-2 text-sm text-gray-400">
          <span v-if="user.currentName?.username">@{{ user.currentName.username }}</span>
          <span class="font-mono">{{ user.userId }}</span>
          <span>First seen {{ formatDateShort(user.firstSeen) }}</span>
        </div>
      </div>

      <div class="border-b border-gray-800 mb-6">
        <div class="flex gap-0 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap"
            :class="activeTab === tab.id
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Overview -->
      <div v-if="activeTab === 'overview'">
        <div v-if="user.stats" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p class="text-sm text-gray-400 mb-1">Messages</p>
            <p class="text-2xl font-bold">{{ user.stats.totalMessages.toLocaleString() }}</p>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p class="text-sm text-gray-400 mb-1">Voice Time</p>
            <p class="text-2xl font-bold">{{ formatDuration(user.stats.totalVoiceTimeMinutes) }}</p>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p class="text-sm text-gray-400 mb-1">Activities</p>
            <p class="text-2xl font-bold">{{ user.stats.totalActivities.toLocaleString() }}</p>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p class="text-sm text-gray-400 mb-1">Most Active Hour</p>
            <p class="text-2xl font-bold">{{ user.stats.mostActiveHour != null ? `${user.stats.mostActiveHour}:00` : '—' }}</p>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p class="text-sm text-gray-400 mb-1">Favorite Activity</p>
            <p class="text-xl font-semibold truncate">{{ user.stats.favoriteActivity || '—' }}</p>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p class="text-sm text-gray-400 mb-1">Top Channel</p>
            <p class="text-xl font-semibold font-mono truncate">{{ user.stats.mostUsedChannel || '—' }}</p>
          </div>
        </div>

        <!-- Unique Activities -->
        <h2 class="text-lg font-semibold mb-3">All Activities</h2>
        <div v-if="uniqueActLoading" class="text-gray-500 text-sm mb-6">Loading...</div>
        <div v-else-if="uniqueActivities.length" class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-800 text-left text-gray-400">
                <th class="px-4 py-2.5 font-medium">Activity</th>
                <th class="px-4 py-2.5 font-medium text-right">Total Hours</th>
                <th class="px-4 py-2.5 font-medium text-right">Sessions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ua in uniqueActivities" :key="ua.activityName" class="border-b border-gray-800/50">
                <td class="px-4 py-2.5 font-medium">{{ ua.activityName }}</td>
                <td class="px-4 py-2.5 text-right text-gray-400">{{ formatHours(ua.totalHours) }}</td>
                <td class="px-4 py-2.5 text-right text-gray-500">{{ ua.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-gray-500 text-sm mb-8">No activities recorded</div>

        <h2 class="text-lg font-semibold mb-3">Name History</h2>
        <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-800 text-left text-gray-400">
                <th class="px-4 py-2.5 font-medium">Username</th>
                <th class="px-4 py-2.5 font-medium">Display Name</th>
                <th class="px-4 py-2.5 font-medium">Global Name</th>
                <th class="px-4 py-2.5 font-medium">From</th>
                <th class="px-4 py-2.5 font-medium">Until</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(name, i) in user.nameHistory" :key="i" class="border-b border-gray-800/50">
                <td class="px-4 py-2.5">{{ name.username }}</td>
                <td class="px-4 py-2.5 text-gray-400">{{ name.displayName || '—' }}</td>
                <td class="px-4 py-2.5 text-gray-400">{{ name.globalName || '—' }}</td>
                <td class="px-4 py-2.5 text-gray-500">{{ formatDateShort(name.effectiveFrom) }}</td>
                <td class="px-4 py-2.5 text-gray-500">
                  {{ name.effectiveUntil ? formatDateShort(name.effectiveUntil) : 'Current' }}
                </td>
              </tr>
              <tr v-if="!user.nameHistory.length">
                <td colspan="5" class="px-4 py-6 text-center text-gray-500">No name history</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Statistics -->
      <div v-if="activeTab === 'statistics'">
        <div class="flex flex-wrap items-center gap-3 mb-6">
          <div class="flex items-center gap-2">
            <input type="date" v-model="periodStart" @change="onPeriodDateChange()"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span class="text-gray-500 text-sm">to</span>
            <input type="date" v-model="periodEnd" @change="onPeriodDateChange()"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex gap-1">
            <button v-for="p in [{d:7,l:'7d'},{d:30,l:'30d'},{d:90,l:'90d'},{d:365,l:'1y'},{d:null,l:'All'}]"
              :key="p.l" @click="setPeriodPreset(p.d)"
              class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
              :class="periodPreset === p.d ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">{{ p.l }}</button>
          </div>
        </div>

        <div v-if="statsLoading" class="text-gray-500 py-8">Loading charts...</div>
        <template v-else-if="statsData">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 h-72">
              <canvas ref="dailyChart"></canvas>
            </div>
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 h-72">
              <canvas ref="hourlyChart"></canvas>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 class="text-sm font-semibold text-gray-300 mb-3">Top Channels (Voice Hours)</h3>
              <div v-if="!statsData.topChannels.length" class="text-gray-500 text-sm">No data</div>
              <div v-for="ch in statsData.topChannels" :key="ch.name" class="flex items-center justify-between py-1.5">
                <span class="font-mono text-sm text-gray-400 truncate mr-3">{{ ch.name }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <div class="w-24 bg-gray-800 rounded-full h-2">
                    <div class="bg-indigo-500 h-2 rounded-full" :style="{ width: statsData.topChannels[0].hours ? (ch.hours / statsData.topChannels[0].hours * 100) + '%' : '0%' }"></div>
                  </div>
                  <span class="text-sm text-gray-400 w-14 text-right">{{ formatHours(ch.hours) }}</span>
                </div>
              </div>
            </div>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 class="text-sm font-semibold text-gray-300 mb-3">Top Activities (Hours)</h3>
              <div v-if="!statsData.topActivities.length" class="text-gray-500 text-sm">No data</div>
              <div v-for="act in statsData.topActivities" :key="act.name" class="flex items-center justify-between py-1.5">
                <span class="text-sm truncate mr-3">{{ act.name }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <div class="w-24 bg-gray-800 rounded-full h-2">
                    <div class="bg-purple-500 h-2 rounded-full" :style="{ width: statsData.topActivities[0].hours ? (act.hours / statsData.topActivities[0].hours * 100) + '%' : '0%' }"></div>
                  </div>
                  <span class="text-sm text-gray-400 w-14 text-right">{{ formatHours(act.hours) }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Messages -->
      <div v-if="activeTab === 'messages'">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <div class="flex items-center gap-2">
            <input type="date" v-model="periodStart" @change="onPeriodDateChange()"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span class="text-gray-500 text-sm">to</span>
            <input type="date" v-model="periodEnd" @change="onPeriodDateChange()"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex gap-1">
            <button v-for="p in [{d:7,l:'7d'},{d:30,l:'30d'},{d:90,l:'90d'},{d:365,l:'1y'},{d:null,l:'All'}]"
              :key="p.l" @click="setPeriodPreset(p.d)"
              class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
              :class="periodPreset === p.d ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">{{ p.l }}</button>
          </div>
          <input
            v-model="msgChannel"
            @keyup.enter="fetchMessages"
            type="text"
            placeholder="Channel ID filter..."
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button @click="fetchMessages" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors">Apply</button>
        </div>

        <div v-if="messagesLoading" class="text-gray-500 py-4">Loading...</div>
        <div v-else class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-800 text-left text-gray-400">
                <th class="px-4 py-2.5 font-medium">Channel</th>
                <th class="px-4 py-2.5 font-medium">Type</th>
                <th class="px-4 py-2.5 font-medium">Chars</th>
                <th class="px-4 py-2.5 font-medium">Extras</th>
                <th class="px-4 py-2.5 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="msg in messages" :key="msg.messageId" class="border-b border-gray-800/50">
                <td class="px-4 py-2.5 font-mono text-xs text-gray-400">{{ msg.channelId }}</td>
                <td class="px-4 py-2.5 capitalize">{{ msg.messageType.toLowerCase().replace('_', ' ') }}</td>
                <td class="px-4 py-2.5 text-gray-400">{{ msg.characterCount ?? '—' }}</td>
                <td class="px-4 py-2.5">
                  <span v-if="msg.hasAttachments" class="text-indigo-400 text-xs mr-1">Files</span>
                  <span v-if="msg.hasEmbeds" class="text-purple-400 text-xs">Embeds</span>
                  <span v-if="!msg.hasAttachments && !msg.hasEmbeds" class="text-gray-600">—</span>
                </td>
                <td class="px-4 py-2.5 text-gray-500">{{ formatDate(msg.sentAt) }}</td>
              </tr>
              <tr v-if="!messages.length">
                <td colspan="5" class="px-4 py-6 text-center text-gray-500">No messages</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Voice -->
      <div v-if="activeTab === 'voice'">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <div class="flex items-center gap-2">
            <input type="date" v-model="periodStart" @change="onPeriodDateChange()"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span class="text-gray-500 text-sm">to</span>
            <input type="date" v-model="periodEnd" @change="onPeriodDateChange()"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex gap-1">
            <button v-for="p in [{d:7,l:'7d'},{d:30,l:'30d'},{d:90,l:'90d'},{d:365,l:'1y'},{d:null,l:'All'}]"
              :key="p.l" @click="setPeriodPreset(p.d)"
              class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
              :class="periodPreset === p.d ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">{{ p.l }}</button>
          </div>
          <input
            v-model="voiceChannel"
            @keyup.enter="fetchVoice"
            type="text"
            placeholder="Channel ID filter..."
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button @click="fetchVoice" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors">Apply</button>

          <div class="ml-auto flex items-center gap-2 text-sm text-gray-400">
            <span>Sort:</span>
            <button @click="voiceSortBy = 'date'" class="px-2 py-0.5 rounded text-xs"
              :class="voiceSortBy === 'date' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700'">Date</button>
            <button @click="voiceSortBy = 'duration'" class="px-2 py-0.5 rounded text-xs"
              :class="voiceSortBy === 'duration' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700'">Duration</button>
          </div>
        </div>

        <div v-if="voiceLoading" class="text-gray-500 py-4">Loading...</div>
        <div v-else class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-800 text-left text-gray-400">
                <th class="px-4 py-2.5 font-medium w-6"></th>
                <th class="px-4 py-2.5 font-medium">Channel</th>
                <th class="px-4 py-2.5 font-medium">Joined</th>
                <th class="px-4 py-2.5 font-medium">Left</th>
                <th class="px-4 py-2.5 font-medium">Duration</th>
                <th class="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="vs in sortedVoiceSessions" :key="vs.id">
                <tr
                  class="border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/30 transition-colors"
                  @click="toggleSession(vs.id)"
                >
                  <td class="px-4 py-2.5 text-gray-500">
                    <span v-if="vs.voiceStates && vs.voiceStates.length" class="text-xs">{{ expandedSession === vs.id ? '▼' : '▶' }}</span>
                  </td>
                  <td class="px-4 py-2.5 font-mono text-xs text-gray-400">{{ vs.channelId }}</td>
                  <td class="px-4 py-2.5 text-gray-400">{{ formatDate(vs.joinedAt) }}</td>
                  <td class="px-4 py-2.5 text-gray-400">{{ vs.leftAt ? formatDate(vs.leftAt) : '—' }}</td>
                  <td class="px-4 py-2.5">{{ formatDuration(vs.durationMinutes) }}</td>
                  <td class="px-4 py-2.5">
                    <span
                      v-if="vs.isOngoing"
                      class="text-green-400 text-xs font-medium px-2 py-0.5 bg-green-400/10 rounded-full"
                    >Live</span>
                    <span v-else-if="vs.voiceStates && vs.voiceStates.length" class="text-gray-500 text-xs">
                      {{ vs.voiceStates.length }} state{{ vs.voiceStates.length > 1 ? 's' : '' }}
                    </span>
                  </td>
                </tr>
                <!-- Expanded voice states -->
                <tr v-if="expandedSession === vs.id && vs.voiceStates && vs.voiceStates.length">
                  <td colspan="6" class="px-0 py-0">
                    <div class="bg-gray-950/50 px-8 py-3">
                      <div class="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Voice States</div>
                      <div class="space-y-1.5">
                        <div v-for="state in vs.voiceStates" :key="state.id"
                          class="flex items-center gap-4 text-sm">
                          <span class="font-medium w-28" :class="stateColors[state.stateType] || 'text-gray-400'">
                            {{ stateLabels[state.stateType] || state.stateType }}
                          </span>
                          <span class="text-gray-500 text-xs">{{ formatDate(state.startedAt) }}</span>
                          <span class="text-gray-600 text-xs">→</span>
                          <span class="text-gray-500 text-xs">{{ state.endedAt ? formatDate(state.endedAt) : 'Active' }}</span>
                          <span class="text-gray-400 text-xs ml-auto">{{ formatDuration(state.durationMinutes) }}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="!voiceSessions.length">
                <td colspan="6" class="px-4 py-6 text-center text-gray-500">No voice sessions</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Activities -->
      <div v-if="activeTab === 'activities'">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <div class="flex items-center gap-2">
            <input type="date" v-model="periodStart" @change="onPeriodDateChange()"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span class="text-gray-500 text-sm">to</span>
            <input type="date" v-model="periodEnd" @change="onPeriodDateChange()"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex gap-1">
            <button v-for="p in [{d:7,l:'7d'},{d:30,l:'30d'},{d:90,l:'90d'},{d:365,l:'1y'},{d:null,l:'All'}]"
              :key="p.l" @click="setPeriodPreset(p.d)"
              class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
              :class="periodPreset === p.d ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">{{ p.l }}</button>
          </div>

          <div class="ml-auto flex items-center gap-2 text-sm text-gray-400">
            <span>Sort:</span>
            <button @click="actSortBy = 'date'" class="px-2 py-0.5 rounded text-xs"
              :class="actSortBy === 'date' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700'">Date</button>
            <button @click="actSortBy = 'duration'" class="px-2 py-0.5 rounded text-xs"
              :class="actSortBy === 'duration' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700'">Duration</button>
          </div>
        </div>

        <div v-if="activitiesLoading" class="text-gray-500 py-4">Loading...</div>
        <div v-else class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-800 text-left text-gray-400">
                <th class="px-4 py-2.5 font-medium">Activity</th>
                <th class="px-4 py-2.5 font-medium">Type</th>
                <th class="px-4 py-2.5 font-medium">Started</th>
                <th class="px-4 py-2.5 font-medium">Duration</th>
                <th class="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="act in sortedActivities" :key="act.id" class="border-b border-gray-800/50">
                <td class="px-4 py-2.5 font-medium">{{ act.activityName }}</td>
                <td class="px-4 py-2.5 text-gray-400 capitalize">{{ act.activityType.toLowerCase() }}</td>
                <td class="px-4 py-2.5 text-gray-500">{{ formatDate(act.startedAt) }}</td>
                <td class="px-4 py-2.5">{{ formatDuration(act.durationMinutes) }}</td>
                <td class="px-4 py-2.5">
                  <span
                    v-if="act.isOngoing"
                    class="text-green-400 text-xs font-medium px-2 py-0.5 bg-green-400/10 rounded-full"
                  >Live</span>
                </td>
              </tr>
              <tr v-if="!activitiesList.length">
                <td colspan="5" class="px-4 py-6 text-center text-gray-500">No activities</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Presence -->
      <div v-if="activeTab === 'presence'">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <div class="flex items-center gap-2">
            <input type="date" v-model="periodStart" @change="onPeriodDateChange()"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span class="text-gray-500 text-sm">to</span>
            <input type="date" v-model="periodEnd" @change="onPeriodDateChange()"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex gap-1">
            <button v-for="p in [{d:7,l:'7d'},{d:30,l:'30d'},{d:90,l:'90d'},{d:365,l:'1y'},{d:null,l:'All'}]"
              :key="p.l" @click="setPeriodPreset(p.d)"
              class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
              :class="periodPreset === p.d ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">{{ p.l }}</button>
          </div>

          <div class="flex items-center gap-1.5 text-sm text-gray-400">
            <span class="text-gray-500">Status:</span>
            <button v-for="opt in presStatusOptions" :key="opt.value || 'all'"
              type="button"
              @click="presStatusFilter = opt.value"
              class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
              :class="presStatusFilter === opt.value ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
              {{ opt.label }}
            </button>
          </div>

          <div class="ml-auto flex items-center gap-2 text-sm text-gray-400">
            <span>Sort:</span>
            <button @click="presSortBy = 'date'" class="px-2 py-0.5 rounded text-xs"
              :class="presSortBy === 'date' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700'">Date</button>
            <button @click="presSortBy = 'duration'" class="px-2 py-0.5 rounded text-xs"
              :class="presSortBy === 'duration' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700'">Duration</button>
          </div>
        </div>

        <div v-if="presenceLoading" class="text-gray-500 py-4">Loading...</div>
        <div v-else class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-800 text-left text-gray-400">
                <th class="px-4 py-2.5 font-medium">Status</th>
                <th class="px-4 py-2.5 font-medium">Since</th>
                <th class="px-4 py-2.5 font-medium">Until</th>
                <th class="px-4 py-2.5 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ps in sortedPresence" :key="ps.id" class="border-b border-gray-800/50">
                <td class="px-4 py-2.5 font-medium" :class="statusColors[ps.statusType] || 'text-gray-400'">
                  {{ ps.statusType }}
                </td>
                <td class="px-4 py-2.5 text-gray-400">{{ formatDate(ps.setAt) }}</td>
                <td class="px-4 py-2.5 text-gray-400">{{ ps.changedAt ? formatDate(ps.changedAt) : '—' }}</td>
                <td class="px-4 py-2.5">
                  {{ ps.isCurrent ? 'Current' : formatDuration(ps.durationMinutes) }}
                </td>
              </tr>
              <tr v-if="presenceList.length && !sortedPresence.length">
                <td colspan="4" class="px-4 py-6 text-center text-gray-500">No entries match the selected status</td>
              </tr>
              <tr v-if="!presenceList.length">
                <td colspan="4" class="px-4 py-6 text-center text-gray-500">No presence data</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Custom Statuses -->
      <div v-if="activeTab === 'statuses'">
        <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-800 text-left text-gray-400">
                <th class="px-4 py-2.5 font-medium">Emoji</th>
                <th class="px-4 py-2.5 font-medium">Text</th>
                <th class="px-4 py-2.5 font-medium">Set At</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cs in user.customStatuses" :key="cs.id" class="border-b border-gray-800/50">
                <td class="px-4 py-2.5 text-xl">{{ cs.emoji || '—' }}</td>
                <td class="px-4 py-2.5">{{ cs.statusText || '—' }}</td>
                <td class="px-4 py-2.5 text-gray-500">{{ formatDate(cs.setAt) }}</td>
              </tr>
              <tr v-if="!user.customStatuses.length">
                <td colspan="3" class="px-4 py-6 text-center text-gray-500">No custom statuses</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
