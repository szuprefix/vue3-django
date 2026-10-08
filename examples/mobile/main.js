import { createApp } from 'vue'
import 'vant/lib/index.css'
import App from './App.vue'
import { createMobileRouter } from './router.js'

createApp(App).use(createMobileRouter()).mount('#app')
