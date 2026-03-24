import { createClient, fetchExchange } from '@urql/vue'
import { useAuthStore } from '@/stores/auth'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const graphqlClient = createClient({
  url: `${apiUrl}/graphql`,
  exchanges: [fetchExchange],
  fetchOptions: () => {
    const authStore = useAuthStore()
    const token = authStore.getToken()
    
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    }
  },
})

export function useGraphQL() {
  return {
    client: graphqlClient,
  }
}
