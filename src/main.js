import { createApp } from 'vue'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import './styles/theme.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
