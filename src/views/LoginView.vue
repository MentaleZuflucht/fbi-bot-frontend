<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-white mb-2">FBI Bot</h1>
          <p class="text-purple-200">Discord Analytics Dashboard</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label for="password" class="block text-sm font-medium text-purple-100 mb-2">
              Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter password"
              required
            />
          </div>

          <div v-if="error" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            :disabled="loading"
          >
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </form>

        <p class="text-center text-purple-300/70 text-sm mt-6">
          Contact your server admin for access
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  error.value = ''
  loading.value = true

  try {
    const success = await authStore.login(password.value)
    
    if (success) {
      await router.push({ name: 'dashboard' })
    } else {
      error.value = 'Invalid password'
      password.value = ''
    }
  } catch (err) {
    error.value = 'Connection error. Please try again.'
    console.error('Login error:', err)
  } finally {
    loading.value = false
  }
}
</script>
