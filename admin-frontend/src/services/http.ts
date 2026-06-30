import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const session = config.headers?.['X-Admin-Session'] === 'merchant' ? 'merchant' : 'platform'
  delete config.headers?.['X-Admin-Session']
  const token = localStorage.getItem(`${session}_admin_access_token`)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use((response) => response.data)
