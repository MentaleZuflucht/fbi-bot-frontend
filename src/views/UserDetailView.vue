<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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

// --- Filters ---
const msgDays = ref('30')
const msgChannel = ref('')
const voiceDays = ref('30')
const voiceChannel = ref('')

// --- Lazy-loaded tab data ---
const messages = ref([])
const messagesLoading = ref(false)
const voiceSessions = ref([])
const voiceLoading = ref(false)

// --- Stats tab ---
const statsDays = ref('30')
const statsData = ref(null)
const statsLoading = ref(false)
const dailyChart = ref(null)
const hourlyChart = ref(null)
let dailyChartInstance = null
let hourlyChartInstance = null

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
          activities(limit: 50) {
            id
            activityType
            activityName
            startedAt
            endedAt
            durationMinutes
            isOngoing
          }
          presenceStatus(limit: 50) {
            id
            statusType
            setAt
            changedAt
            durationMinutes
            isCurrent
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
    const vars = { userId: userId.value, limit: 100 }
    if (msgDays.value) vars.days = parseInt(msgDays.value)
    if (msgChannel.value.trim()) vars.channelId = msgChannel.value.trim()
    const data = await gql(`
      query Messages($userId: String, $limit: Int, $days: Int, $channelId: String) {
        messages(userId: $userId, limit: $limit, days: $days, channelId: $channelId) {
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
  try {
    const vars = { userId: userId.value, limit: 100 }
    if (voiceDays.value) vars.days = parseInt(voiceDays.value)
    if (voiceChannel.value.trim()) vars.channelId = voiceChannel.value.trim()
    const data = await gql(`
      query VoiceSessions($userId: String, $limit: Int, $days: Int, $channelId: String) {
        voiceSessions(userId: $userId, limit: $limit, days: $days, channelId: $channelId) {
          id
          channelId
          joinedAt
          leftAt
          durationMinutes
          isOngoing
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

async function fetchStats() {
  statsLoading.value = true
  try {
    const days = statsDays.value ? parseInt(statsDays.value) : null
    const data = await gql(`
      query UserCharts($days: Int, $userId: String) {
        dailyStats(days: $days, userId: $userId) { date messageCount voiceHours activityCount }
        hourlyMessageDistribution(days: $days, userId: $userId) { hour count }
        topChannels(days: $days, userId: $userId, limit: 8) { name count }
        topActivities(days: $days, userId: $userId, limit: 8) { name count }
      }
    `, { days, userId: userId.value })
    statsData.value = data
    await nextTick()
    renderCharts()
  } catch (e) {
    error.value = e.message
  } finally {
    statsLoading.value = false
  }
}

function renderCharts() {
  if (dailyChartInstance) dailyChartInstance.destroy()
  if (hourlyChartInstance) hourlyChartInstance.destroy()

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

watch(activeTab, (tab) => {
  if (tab === 'messages' && !messages.value.length && !messagesLoading.value) fetchMessages()
  if (tab === 'voice' && !voiceSessions.value.length && !voiceLoading.value) fetchVoice()
  if (tab === 'statistics' && !statsData.value && !statsLoading.value) fetchStats()
})

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

const statusColors = {
  ONLINE: 'text-green-400',
  IDLE: 'text-yellow-400',
  DND: 'text-red-400',
  OFFLINE: 'text-gray-500',
  STREAMING: 'text-purple-400',
}

onMounted(fetchUser)
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
        <div class="flex items-center gap-3 mb-6">
          <label class="text-sm text-gray-400">Period:</label>
          <select
            v-model="statsDays"
            @change="fetchStats"
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">6 months</option>
            <option value="365">1 year</option>
            <option value="">All time</option>
          </select>
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
              <h3 class="text-sm font-semibold text-gray-300 mb-3">Top Channels</h3>
              <div v-if="!statsData.topChannels.length" class="text-gray-500 text-sm">No data</div>
              <div v-for="ch in statsData.topChannels" :key="ch.name" class="flex items-center justify-between py-1.5">
                <span class="font-mono text-sm text-gray-400 truncate mr-3">{{ ch.name }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <div class="w-24 bg-gray-800 rounded-full h-2">
                    <div class="bg-indigo-500 h-2 rounded-full" :style="{ width: (ch.count / statsData.topChannels[0].count * 100) + '%' }"></div>
                  </div>
                  <span class="text-sm text-gray-400 w-12 text-right">{{ ch.count }}</span>
                </div>
              </div>
            </div>

            <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 class="text-sm font-semibold text-gray-300 mb-3">Top Activities</h3>
              <div v-if="!statsData.topActivities.length" class="text-gray-500 text-sm">No data</div>
              <div v-for="act in statsData.topActivities" :key="act.name" class="flex items-center justify-between py-1.5">
                <span class="text-sm truncate mr-3">{{ act.name }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <div class="w-24 bg-gray-800 rounded-full h-2">
                    <div class="bg-purple-500 h-2 rounded-full" :style="{ width: (act.count / statsData.topActivities[0].count * 100) + '%' }"></div>
                  </div>
                  <span class="text-sm text-gray-400 w-12 text-right">{{ act.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Messages -->
      <div v-if="activeTab === 'messages'">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <select
            v-model="msgDays"
            @change="fetchMessages"
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="">All time</option>
          </select>
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
          <select
            v-model="voiceDays"
            @change="fetchVoice"
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="">All time</option>
          </select>
          <input
            v-model="voiceChannel"
            @keyup.enter="fetchVoice"
            type="text"
            placeholder="Channel ID filter..."
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button @click="fetchVoice" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors">Apply</button>
        </div>

        <div v-if="voiceLoading" class="text-gray-500 py-4">Loading...</div>
        <div v-else class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-800 text-left text-gray-400">
                <th class="px-4 py-2.5 font-medium">Channel</th>
                <th class="px-4 py-2.5 font-medium">Joined</th>
                <th class="px-4 py-2.5 font-medium">Left</th>
                <th class="px-4 py-2.5 font-medium">Duration</th>
                <th class="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="vs in voiceSessions" :key="vs.id" class="border-b border-gray-800/50">
                <td class="px-4 py-2.5 font-mono text-xs text-gray-400">{{ vs.channelId }}</td>
                <td class="px-4 py-2.5 text-gray-400">{{ formatDate(vs.joinedAt) }}</td>
                <td class="px-4 py-2.5 text-gray-400">{{ vs.leftAt ? formatDate(vs.leftAt) : '—' }}</td>
                <td class="px-4 py-2.5">{{ formatDuration(vs.durationMinutes) }}</td>
                <td class="px-4 py-2.5">
                  <span
                    v-if="vs.isOngoing"
                    class="text-green-400 text-xs font-medium px-2 py-0.5 bg-green-400/10 rounded-full"
                  >Live</span>
                </td>
              </tr>
              <tr v-if="!voiceSessions.length">
                <td colspan="5" class="px-4 py-6 text-center text-gray-500">No voice sessions</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Activities -->
      <div v-if="activeTab === 'activities'">
        <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
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
              <tr v-for="act in user.activities" :key="act.id" class="border-b border-gray-800/50">
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
              <tr v-if="!user.activities.length">
                <td colspan="5" class="px-4 py-6 text-center text-gray-500">No activities</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Presence -->
      <div v-if="activeTab === 'presence'">
        <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
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
              <tr v-for="ps in user.presenceStatus" :key="ps.id" class="border-b border-gray-800/50">
                <td class="px-4 py-2.5 font-medium" :class="statusColors[ps.statusType] || 'text-gray-400'">
                  {{ ps.statusType }}
                </td>
                <td class="px-4 py-2.5 text-gray-400">{{ formatDate(ps.setAt) }}</td>
                <td class="px-4 py-2.5 text-gray-400">{{ ps.changedAt ? formatDate(ps.changedAt) : '—' }}</td>
                <td class="px-4 py-2.5">
                  {{ ps.isCurrent ? 'Current' : formatDuration(ps.durationMinutes) }}
                </td>
              </tr>
              <tr v-if="!user.presenceStatus.length">
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
