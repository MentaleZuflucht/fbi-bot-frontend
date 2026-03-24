import { createClient, fetchExchange } from '@urql/vue'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const apiKey = import.meta.env.VITE_API_KEY || ''

export const graphqlClient = createClient({
  url: `${apiUrl}/graphql`,
  exchanges: [fetchExchange],
  fetchOptions: () => ({
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  }),
})

export function useGraphQL() {
  return {
    client: graphqlClient,
  }
}
