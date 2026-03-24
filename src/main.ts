import { createApp } from 'vue'
import { createPinia } from 'pinia'
import urql from '@urql/vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { graphqlClient } from './composables/useGraphQL'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(urql, graphqlClient)

app.mount('#app')
