import { reactive } from 'vue'

// Preserve the legacy access_token cookie and auth/user endpoints.
export function createAuth({ http, endpoints = {}, cookieName = 'access_token' }) {
  const urls = { login: 'auth/user/login/', current: 'auth/user/current/', logout: 'auth/user/logout/', ...endpoints }
  const state = reactive({ user: null, ready: false })
  let pending
  function getToken() {
    if (typeof document === 'undefined') return undefined
    const value = document.cookie.split('; ').find(v => v.startsWith(`${cookieName}=`))
    return value ? decodeURIComponent(value.slice(cookieName.length + 1)) : undefined
  }
  function setToken(token) {
    if (token) http.defaults.headers.common.Authorization = `Bearer ${token}`
    else delete http.defaults.headers.common.Authorization
    if (typeof document !== 'undefined') document.cookie = `${cookieName}=${encodeURIComponent(token || '')}; Path=/; SameSite=Lax${token ? '' : '; Max-Age=0'}${location.protocol === 'https:' ? '; Secure' : ''}`
  }
  const token = getToken()
  if (token) http.defaults.headers.common.Authorization = `Bearer ${token}`
  async function getUserInfo() {
    if (!pending) pending = http.get(urls.current).then(({ data }) => {
      state.user = data
      state.ready = true
      return data
    }).finally(() => { pending = undefined })
    return pending
  }
  async function login(username, password) {
    const { data } = await http.post(urls.login, { username, password })
    if (data.token?.access) setToken(data.token.access)
    try { await getUserInfo() } catch (error) { setToken(null); state.user = null; throw error }
    return data
  }
  async function logout() {
    const { data } = await http.get(urls.logout)
    setToken(null)
    state.user = null
    state.ready = false
    return data
  }
  return { state, getToken, setToken, removeToken: () => setToken(null), getUserInfo, login, logout }
}
