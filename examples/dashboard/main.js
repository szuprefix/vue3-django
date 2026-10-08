import 'element-plus/dist/index.css'
import 'font-awesome/css/font-awesome.css'
import { createDjangoApp, createHttp } from '../../src/index.js'
import { demoAdapter } from './mock.js'
import { apiApps, mockApps } from './apps.js'

const realApi = import.meta.env.VITE_REAL_API === 'true'
const application = createDjangoApp({
  title: 'vue3-django',
  apps: realApi ? apiApps : mockApps,
  auth: realApi ? undefined : false,
  http: realApi ? createHttp() : createHttp({ adapter: demoAdapter }),
  configModules: import.meta.glob('./views/**/config.js'),
  viewModules: import.meta.glob('./views/**/*.vue'),
})
application.mount('#app')
