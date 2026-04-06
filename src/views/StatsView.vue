<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { gql } from '../lib/api'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const router = useRouter()

const startDate = ref('')
const endDate = ref('')
const activePreset = ref(30)
const loading = ref(true)
const error = ref('')

const serverStats = ref(null)
const dailyData = ref([])
const hourlyData = ref([])
const topChannels = ref([])
const topActivities = ref([])
const topUsers = ref([])

const dailyChart = ref(null)
const hourlyChart = ref(null)
const channelChart = ref(null)
const voiceDailyChart = ref(null)

let charts = []

function destroyCharts() {
  charts.forEach(c => c.destroy())
  charts = []
}

onBeforeUnmount(destroyCharts)

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
  fetchAll()
}

function onDateChange() {
  activePreset.value = null
  fetchAll()
}

function buildDateVars() {
  const vars = {}
  if (startDate.value) vars.startDate = startDate.value
  if (endDate.value) vars.endDate = endDate.value
  return vars
}

async function fetchAll() {
  loading.value = true
  error.value = ''
  destroyCharts()
  try {
    const vars = buildDateVars()
    const data = await gql(`
      query ServerCharts($startDate: String, $endDate: String) {
        serverStats(startDate: $startDate, endDate: $endDate) {
          totalMessages
          totalVoiceTimeHours
          totalActivities
          mostActiveChannelId
          mostCommonActivity
        }
        dailyStats(startDate: $startDate, endDate: $endDate) { date messageCount voiceHours activityCount activeUsers }
        hourlyMessageDistribution(startDate: $startDate, endDate: $endDate) { hour count }
        topChannels(startDate: $startDate, endDate: $endDate, limit: 10) { name count hours }
        topActivities(startDate: $startDate, endDate: $endDate, limit: 10) { name count hours }
        topUsers(startDate: $startDate, endDate: $endDate, limit: 10) { userId name messageCount voiceHours score }
      }
    `, vars)

    serverStats.value = data.serverStats
    dailyData.value = data.dailyStats
    hourlyData.value = data.hourlyMessageDistribution
    topChannels.value = data.topChannels
    topActivities.value = data.topActivities
    topUsers.value = data.topUsers
    loading.value = false

    await nextTick()
    renderCharts()
  } catch (e) {
    error.value = e.message
    loading.value = false
  }
}

function baseOpts(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ca3af' } },
      title: { display: true, text: title, color: '#e5e7eb', font: { size: 14 } },
    },
    scales: {
      x: { ticks: { color: '#6b7280', maxRotation: 45 }, grid: { color: 'rgba(55,65,81,0.5)' } },
      y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(55,65,81,0.5)' }, beginAtZero: true },
    },
  }
}

function renderCharts() {
  if (dailyChart.value) {
    const c = new Chart(dailyChart.value, {
      type: 'line',
      data: {
        labels: dailyData.value.map(d => d.date),
        datasets: [
          {
            label: 'Messages',
            data: dailyData.value.map(d => d.messageCount),
            borderColor: 'rgb(99,102,241)',
            backgroundColor: 'rgba(99,102,241,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
          },
        ],
      },
      options: baseOpts('Messages per Day'),
    })
    charts.push(c)
  }

  if (voiceDailyChart.value) {
    const c = new Chart(voiceDailyChart.value, {
      type: 'line',
      data: {
        labels: dailyData.value.map(d => d.date),
        datasets: [
          {
            label: 'Voice Hours',
            data: dailyData.value.map(d => d.voiceHours),
            borderColor: 'rgb(168,85,247)',
            backgroundColor: 'rgba(168,85,247,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
          },
          {
            label: 'Active Users',
            data: dailyData.value.map(d => d.activeUsers),
            borderColor: 'rgb(34,197,94)',
            backgroundColor: 'rgba(34,197,94,0.1)',
            fill: false,
            tension: 0.3,
            pointRadius: 2,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        ...baseOpts('Voice & Active Users per Day'),
        scales: {
          ...baseOpts('').scales,
          y1: {
            position: 'right',
            ticks: { color: '#6b7280' },
            grid: { drawOnChartArea: false },
            beginAtZero: true,
          },
        },
      },
    })
    charts.push(c)
  }

  if (hourlyChart.value) {
    const c = new Chart(hourlyChart.value, {
      type: 'bar',
      data: {
        labels: hourlyData.value.map(h => `${h.hour}:00`),
        datasets: [
          {
            label: 'Messages',
            data: hourlyData.value.map(h => h.count),
            backgroundColor: 'rgba(99,102,241,0.7)',
            borderRadius: 3,
          },
        ],
      },
      options: baseOpts('Messages by Hour of Day'),
    })
    charts.push(c)
  }

  if (channelChart.value && topChannels.value.length) {
    const c = new Chart(channelChart.value, {
      type: 'doughnut',
      data: {
        labels: topChannels.value.map(ch => ch.name),
        datasets: [{
          data: topChannels.value.map(ch => ch.hours),
          backgroundColor: [
            'rgba(99,102,241,0.8)', 'rgba(168,85,247,0.8)', 'rgba(236,72,153,0.8)',
            'rgba(34,197,94,0.8)', 'rgba(234,179,8,0.8)', 'rgba(249,115,22,0.8)',
            'rgba(14,165,233,0.8)', 'rgba(244,63,94,0.8)', 'rgba(139,92,246,0.8)',
            'rgba(20,184,166,0.8)',
          ],
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#9ca3af', boxWidth: 12, padding: 8 } },
          title: { display: true, text: 'Top Channels (Voice Hours)', color: '#e5e7eb', font: { size: 14 } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(1)}h`,
            },
          },
        },
      },
    })
    charts.push(c)
  }
}

function formatHours(h) {
  if (h == null || h === 0) return '0h'
  if (h < 1) return `${Math.round(h * 60)}m`
  return `${h.toFixed(1)}h`
}

function formatVoice(hours) {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours}h`
}

setPreset(30)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
      <h1 class="text-2xl font-bold">Server Statistics</h1>
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

    <template v-else-if="serverStats">
      <!-- Summary cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p class="text-sm text-gray-400 mb-1">Total Messages</p>
          <p class="text-3xl font-bold">{{ serverStats.totalMessages.toLocaleString() }}</p>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p class="text-sm text-gray-400 mb-1">Voice Time</p>
          <p class="text-3xl font-bold">{{ serverStats.totalVoiceTimeHours.toFixed(1) }}h</p>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p class="text-sm text-gray-400 mb-1">Activities Logged</p>
          <p class="text-3xl font-bold">{{ serverStats.totalActivities.toLocaleString() }}</p>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p class="text-sm text-gray-400 mb-1">Most Common Activity</p>
          <p class="text-xl font-semibold truncate">{{ serverStats.mostCommonActivity || '—' }}</p>
        </div>
      </div>

      <!-- Charts row 1 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 h-80">
          <canvas ref="dailyChart"></canvas>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 h-80">
          <canvas ref="voiceDailyChart"></canvas>
        </div>
      </div>

      <!-- Charts row 2 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 h-80">
          <canvas ref="hourlyChart"></canvas>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 h-80">
          <canvas ref="channelChart"></canvas>
        </div>
      </div>

      <!-- Top lists -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Top Users -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-gray-300 mb-4">Top Users</h3>
          <div v-if="!topUsers.length" class="text-gray-500 text-sm">No data</div>
          <div
            v-for="(u, i) in topUsers"
            :key="u.userId"
            @click="router.push(`/users/${u.userId}`)"
            class="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-800/50 -mx-2 px-2 rounded-lg transition-colors"
          >
            <span class="text-gray-500 text-sm w-5 text-right shrink-0">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ u.name }}</p>
              <p class="text-xs text-gray-500">{{ u.messageCount.toLocaleString() }} msgs · {{ formatVoice(u.voiceHours) }} voice</p>
            </div>
            <div class="w-20 bg-gray-800 rounded-full h-2 shrink-0">
              <div class="bg-emerald-500 h-2 rounded-full" :style="{ width: (u.score / topUsers[0].score * 100) + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- Top Channels (Voice Hours) -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-gray-300 mb-4">Top Channels (Voice Hours)</h3>
          <div v-if="!topChannels.length" class="text-gray-500 text-sm">No data</div>
          <div v-for="(ch, i) in topChannels" :key="ch.name" class="flex items-center gap-3 py-2">
            <span class="text-gray-500 text-sm w-5 text-right shrink-0">{{ i + 1 }}</span>
            <span class="font-mono text-sm text-gray-400 truncate flex-1">{{ ch.name }}</span>
            <div class="w-20 bg-gray-800 rounded-full h-2 shrink-0">
              <div class="bg-indigo-500 h-2 rounded-full" :style="{ width: (ch.hours / topChannels[0].hours * 100) + '%' }"></div>
            </div>
            <span class="text-xs text-gray-500 w-14 text-right shrink-0">{{ formatHours(ch.hours) }}</span>
          </div>
        </div>

        <!-- Top Activities (Hours) -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-gray-300 mb-4">Top Activities (Hours)</h3>
          <div v-if="!topActivities.length" class="text-gray-500 text-sm">No data</div>
          <div v-for="(act, i) in topActivities" :key="act.name" class="flex items-center gap-3 py-2">
            <span class="text-gray-500 text-sm w-5 text-right shrink-0">{{ i + 1 }}</span>
            <span class="text-sm truncate flex-1">{{ act.name }}</span>
            <div class="w-20 bg-gray-800 rounded-full h-2 shrink-0">
              <div class="bg-purple-500 h-2 rounded-full" :style="{ width: (act.hours / topActivities[0].hours * 100) + '%' }"></div>
            </div>
            <span class="text-xs text-gray-500 w-14 text-right shrink-0">{{ formatHours(act.hours) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
