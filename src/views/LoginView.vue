<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../lib/api'

const router = useRouter()
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await login(password.value)
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-indigo-400">FBI Bot</h1>
        <p class="text-gray-500 mt-2">Discord Activity Dashboard</p>
      </div>
      <form @submit.prevent="handleLogin" class="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div class="mb-4">
          <label for="password" class="block text-sm font-medium text-gray-400 mb-2">
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autofocus
            placeholder="Enter password"
            class="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <p v-if="error" class="text-red-400 text-sm mb-4">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading || !password"
          class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>
