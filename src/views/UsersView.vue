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
                class="px-3 py-2 rounded-md text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30"
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
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Discord Users</h2>
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search users by name..."
            class="w-full md:w-96 px-4 py-2 pl-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <svg class="absolute left-3 top-2.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div v-if="fetching" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>

      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p class="text-red-800 dark:text-red-200">Error loading users: {{ error.message }}</p>
      </div>

      <div v-else-if="data" class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="divide-y divide-slate-200 dark:divide-slate-700">
          <div
            v-for="user in users"
            :key="user.userId"
            @click="navigateToUser(user.userId)"
            class="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {{ getUserInitials(user) }}
                </div>
                <div>
                  <p class="text-base font-semibold text-slate-900 dark:text-white">
                    {{ getUserDisplayName(user) }}
                  </p>
                  <p class="text-sm text-slate-500 dark:text-slate-400">
                    ID: {{ user.userId }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm text-slate-600 dark:text-slate-300">
                  {{ user.messageCount || 0 }} messages
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Member since {{ formatDate(user.firstSeen) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuery } from '@urql/vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types/discord'

const router = useRouter()
const authStore = useAuthStore()
const searchQuery = ref('')

const { data, fetching, error, executeQuery } = useQuery({
  query: `
    query GetUsers($search: String) {
      users(limit: 50, search: $search) {
        userId
        firstSeen
        currentName {
          username
          displayName
          globalName
        }
        messageCount(days: 30)
      }
    }
  `,
  variables: computed(() => ({
    search: searchQuery.value || null,
  })),
})

const users = computed(() => data.value?.users || [])

watch(searchQuery, () => {
  executeQuery()
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

const navigateToUser = (userId: string) => {
  router.push({ name: 'user-detail', params: { userId } })
}

const handleLogout = () => {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>
