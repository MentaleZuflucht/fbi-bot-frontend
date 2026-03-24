import { defineStore } from 'pinia'
import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const token = ref<string | null>(null)

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      token.value = data.access_token
      isAuthenticated.value = true
      
      // Store token in localStorage for persistence
      localStorage.setItem('fbi-auth-token', data.access_token)
      
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    isAuthenticated.value = false
    token.value = null
    localStorage.removeItem('fbi-auth-token')
  }

  const checkSession = (): boolean => {
    const storedToken = localStorage.getItem('fbi-auth-token')
    if (storedToken) {
      token.value = storedToken
      isAuthenticated.value = true
      return true
    }
    return false
  }

  const getToken = (): string | null => {
    return token.value || localStorage.getItem('fbi-auth-token')
  }

  return {
    isAuthenticated,
    login,
    logout,
    checkSession,
    getToken,
  }
})
