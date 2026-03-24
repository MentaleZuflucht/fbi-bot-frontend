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
                class="px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
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
      <button
        @click="router.back()"
        class="mb-6 flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Users</span>
      </button>

      <div v-if="fetching" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>

      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p class="text-red-800 dark:text-red-200">Error loading user: {{ error.message }}</p>
      </div>

      <div v-else-if="data?.user" class="space-y-6">
        <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div class="flex items-center space-x-6">
            <div class="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-3xl">
              {{ getUserInitials(data.user) }}
            </div>
            <div>
              <h2 class="text-3xl font-bold text-slate-900 dark:text-white">
                {{ getUserDisplayName(data.user) }}
              </h2>
              <p class="text-slate-500 dark:text-slate-400 mt-1">ID: {{ data.user.userId }}</p>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Member since {{ formatDate(data.user.firstSeen) }}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Activity Stats (Last 30 Days)</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Messages Sent"
              :value="data.user.stats?.totalMessages || 0"
              icon="💬"
            />
            <StatCard
              title="Voice Time"
              :value="`${Math.round((data.user.stats?.totalVoiceTimeMinutes || 0) / 60)}h`"
              icon="🎤"
            />
            <StatCard
              title="Activities"
              :value="data.user.stats?.totalActivities || 0"
              icon="🎮"
            />
          </div>
        </div>

        <div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Recent Activities</h3>
          <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="divide-y divide-slate-200 dark:divide-slate-700">
              <div
                v-for="activity in data.user.activities"
                :key="activity.id"
                class="p-4"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <span class="text-2xl">{{ getActivityIcon(activity.activityType) }}</span>
                    <div>
                      <p class="text-sm font-medium text-slate-900 dark:text-white">{{ activity.activityName }}</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400 capitalize">{{ activity.activityType }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                      {{ formatDate(activity.startedAt) }}
                    </p>
                    <p v-if="activity.durationMinutes" class="text-xs text-slate-500 dark:text-slate-400">
                      {{ formatDuration(activity.durationMinutes) }}
                    </p>
                  </div>
                </div>
              </div>
              <div v-if="!data.user.activities?.length" class="p-8 text-center text-slate-500 dark:text-slate-400">
                No recent activities
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Recent Voice Sessions</h3>
          <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="divide-y divide-slate-200 dark:divide-slate-700">
              <div
                v-for="session in data.user.voiceSessions"
                :key="session.id"
                class="p-4"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-slate-900 dark:text-white">Channel {{ session.channelId }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                      Joined {{ formatDate(session.joinedAt) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {{ formatDuration(session.durationMinutes || 0) }}
                    </p>
                    <p v-if="!session.leftAt" class="text-xs text-green-600 dark:text-green-400">
                      Currently active
                    </p>
                  </div>
                </div>
              </div>
              <div v-if="!data.user.voiceSessions?.length" class="p-8 text-center text-slate-500 dark:text-slate-400">
                No recent voice sessions
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p class="text-yellow-800 dark:text-yellow-200">User not found</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@urql/vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import StatCard from '@/components/StatCard.vue'
import type { User, ActivityType } from '@/types/discord'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const userId = computed(() => route.params.userId as string)

const { data, fetching, error } = useQuery({
  query: `
    query GetUser($userId: String!) {
      user(userId: $userId) {
        userId
        firstSeen
        currentName {
          username
          displayName
          globalName
        }
        stats(days: 30) {
          totalMessages
          totalVoiceTimeMinutes
          totalActivities
          mostActiveHour
          favoriteActivity
        }
        activities(limit: 10) {
          id
          activityType
          activityName
          startedAt
          endedAt
          durationMinutes
        }
        voiceSessions(limit: 10) {
          id
          channelId
          joinedAt
          leftAt
          durationMinutes
        }
      }
    }
  `,
  variables: userId,
})

const getUserDisplayName = (user: User): string => {
  if (!user.currentName) return `User ${user.userId}`
  return user.currentName.displayName || user.currentName.globalName || user.currentName.username || `User ${user.userId}`
}

const getUserInitials = (user: User): string => {
  const name = getUserDisplayName(user)
  if (name.startsWith('User ')) return name.slice(-2).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const getActivityIcon = (activityType: ActivityType): string => {
  const icons: Record<ActivityType, string> = {
    playing: '🎮',
    streaming: '📺',
    listening: '🎵',
    watching: '👀',
    competing: '🏆',
    custom: '✨',
  }
  return icons[activityType] || '🎮'
}

const handleLogout = () => {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>
