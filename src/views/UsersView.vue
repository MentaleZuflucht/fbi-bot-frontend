<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { gql } from '../lib/api'

const router = useRouter()
const users = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const hasMore = ref(true)
const offset = ref(0)
const LIMIT = 50
let searchTimeout = null

async function fetchUsers(reset = true) {
  if (reset) offset.value = 0
  loading.value = true
  error.value = ''
  try {
    const data = await gql(`
      query Users($limit: Int, $offset: Int, $search: String) {
        users(limit: $limit, offset: $offset, search: $search) {
          userId
          firstSeen
          currentName {
            username
            displayName
            globalName
          }
        }
      }
    `, {
      limit: LIMIT,
      offset: offset.value,
      search: search.value || null,
    })
    if (reset) {
      users.value = data.users
    } else {
      users.value.push(...data.users)
    }
    hasMore.value = data.users.length === LIMIT
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function displayName(user) {
  const n = user.currentName
  if (!n) return user.userId
  return n.globalName || n.displayName || n.username || user.userId
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString()
}

function loadMore() {
  offset.value += LIMIT
  fetchUsers(false)
}

watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => fetchUsers(), 300)
})

onMounted(fetchUsers)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Users</h1>
      <input
        v-model="search"
        type="text"
        placeholder="Search users..."
        class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>

    <p v-if="error" class="text-red-400 mb-4">{{ error }}</p>

    <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-800 text-left text-sm text-gray-400">
            <th class="px-6 py-3 font-medium">Name</th>
            <th class="px-6 py-3 font-medium">Username</th>
            <th class="px-6 py-3 font-medium">User ID</th>
            <th class="px-6 py-3 font-medium">First Seen</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.userId"
            @click="router.push(`/users/${user.userId}`)"
            class="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors"
          >
            <td class="px-6 py-4 font-medium">{{ displayName(user) }}</td>
            <td class="px-6 py-4 text-gray-400">{{ user.currentName?.username || '—' }}</td>
            <td class="px-6 py-4 text-gray-500 font-mono text-sm">{{ user.userId }}</td>
            <td class="px-6 py-4 text-gray-400">{{ formatDate(user.firstSeen) }}</td>
          </tr>
          <tr v-if="!users.length && !loading">
            <td colspan="4" class="px-6 py-8 text-center text-gray-500">No users found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="text-center py-4 text-gray-500">Loading...</div>

    <div v-if="hasMore && users.length && !loading" class="text-center py-4">
      <button
        @click="loadMore"
        class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
      >
        Load more
      </button>
    </div>
  </div>
</template>
