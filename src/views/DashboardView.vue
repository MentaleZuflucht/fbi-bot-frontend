<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <nav class="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-8">
            <h1 class="text-xl font-bold text-slate-900 dark:text-white">FBI Bot Dashboard</h1>
            <div class="hidden md:flex space-x-4">
              <router-link
                to="/"
                class="px-3 py-2 rounded-md text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30"
              >
                Dashboard
              </router-link>
              <router-link
                to="/users"
                class="px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Users
              </router-link>
            </div>
          </div>
          <button
            @click="handleLogout"
            class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="fetching" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>

      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p class="text-red-800 dark:text-red-200">Error loading data: {{ error.message }}</p>
      </div>

      <div v-else-if="data" class="space-y-6">
        <div>
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Server Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Total Users"
              :value="data.serverStats.totalUsers"
              icon="👥"
            />
            <StatCard
              title="Total Messages"
              :value="data.serverStats.totalMessages.toLocaleString()"
              icon="💬"
            />
            <StatCard
              title="Voice Time"
              :value="`${Math.round(data.serverStats.totalVoiceTimeHours)}h`"
              icon="🎤"
            />
            <StatCard
              title="Total Activities"
              :value="data.serverStats.totalActivities.toLocaleString()"
              icon="🎮"
            />
            <StatCard
              v-if="data.serverStats.mostCommonActivity"
              title="Most Popular Activity"
              :value="data.serverStats.mostCommonActivity"
              icon="⭐"
            />
            <StatCard
              v-if="data.serverStats.mostActiveChannelId"
              title="Most Active Channel"
              :value="`Channel ${data.serverStats.mostActiveChannelId}`"
              icon="📊"
            />
          </div>
        </div>

        <div>
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h2>
          <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="divide-y divide-slate-200 dark:divide-slate-700">
              <div v-for="message in data.messages" :key="message.messageId" class="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {{ getUserInitials(message.userId) }}
                    </div>
                    <div>
                      <p class="text-sm font-medium text-slate-900 dark:text-white">User {{ message.userId }}</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">Channel {{ message.channelId }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                      {{ formatDate(message.sentAt) }}
                    </p>
                    <div class="flex items-center justify-end space-x-2 mt-1">
                      <span v-if="message.hasAttachments" class="text-xs text-slate-500 dark:text-slate-400">📎</span>
                      <span v-if="message.hasEmbeds" class="text-xs text-slate-500 dark:text-slate-400">🔗</span>
                      <span v-if="message.characterCount" class="text-xs text-slate-500 dark:text-slate-400">
                        {{ message.characterCount }} chars
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from '@urql/vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import StatCard from '@/components/StatCard.vue'

const router = useRouter()
const authStore = useAuthStore()

const { data, fetching, error } = useQuery({
  query: `
    query DashboardData {
      serverStats(days: 30) {
        totalUsers
        totalMessages
        totalVoiceTimeHours
        totalActivities
        mostActiveChannelId
        mostCommonActivity
      }
      messages(limit: 10, days: 7) {
        messageId
        userId
        channelId
        messageType
        hasAttachments
        hasEmbeds
        characterCount
        sentAt
      }
    }
  `,
})

const getUserInitials = (userId: string): string => {
  return userId.slice(-2).toUpperCase()
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}

const handleLogout = () => {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>
