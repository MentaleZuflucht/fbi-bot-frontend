<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isAuthenticated, logout } from './lib/api'

const route = useRoute()
const showNav = computed(() => route.name !== 'login' && isAuthenticated())
</script>

<template>
  <div class="min-h-screen">
    <nav v-if="showNav" class="bg-gray-900 border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-8">
            <router-link to="/" class="text-lg font-bold text-indigo-400">
              FBI Bot
            </router-link>
            <div class="flex gap-1">
              <router-link
                to="/"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="route.name === 'dashboard' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'"
              >
                Dashboard
              </router-link>
              <router-link
                to="/stats"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="route.name === 'stats' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'"
              >
                Statistics
              </router-link>
              <router-link
                to="/users"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="route.name === 'users' || route.name === 'user-detail' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'"
              >
                Users
              </router-link>
            </div>
          </div>
          <button
            @click="logout"
            class="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>
