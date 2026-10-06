import axios from 'axios'
import qs from 'qs'

export function joinErrors(errors = {}) {
  if (typeof errors === 'string') return { non_field_errors: errors }
  if (Array.isArray(errors)) return { non_field_errors: errors.join('；') }
  return Object.fromEntries(
    Object.entries(errors).map(([name, value]) => [
      name,
      Array.isArray(value)
        ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('；')
        : typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : String(value),
    ]),
  )
}

export class DrfError extends Error {
  constructor(error) {
    const data = error.response?.data ?? error.msg ?? error.message
    super(typeof data === 'string' ? data : (data?.detail ?? '请求失败'))
    this.name = 'DrfError'
    this.code = error.response?.status ?? error.code ?? -1
    this.msg = data
    this.fields = this.code === 400 ? joinErrors(data) : {}
    this.cause = error
  }
}

export function createHttp(options = {}) {
  const http = axios.create({
    baseURL: '/api/',
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'comma', skipNulls: true }),
    ...options,
  })
  http.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error instanceof DrfError ? error : new DrfError(error)),
  )
  http.setBaseURL = (url) => {
    http.defaults.baseURL = url
  }
  http.setAuthToken = (token) => {
    if (token) http.defaults.headers.common.Authorization = `Token ${token}`
    else delete http.defaults.headers.common.Authorization
  }
  return http
}
