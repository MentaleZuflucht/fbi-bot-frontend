import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const sessionPassword = ref<string | null>(null)

  const checkPassword = (password: string): boolean => {
    const correctPassword = import.meta.env.VITE_APP_PASSWORD
    if (password === correctPassword) {
      isAuthenticated.value = true
      sessionPassword.value = password
      sessionStorage.setItem('fbi-auth', 'true')
      return true
    }
    return false
  }

  const logout = () => {
    isAuthenticated.value = false
    sessionPassword.value = null
    sessionStorage.removeItem('fbi-auth')
  }

  const checkSession = (): boolean => {
    const hasSession = sessionStorage.getItem('fbi-auth') === 'true'
    if (hasSession) {
      isAuthenticated.value = true
      return true
    }
    return false
  }

  return {
    isAuthenticated,
    checkPassword,
    logout,
    checkSession,
  }
})
